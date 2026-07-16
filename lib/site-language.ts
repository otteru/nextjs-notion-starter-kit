import {
  type Block,
  type ExtendedRecordMap,
  type PageBlock
} from 'notion-types'
import { getPageProperty, parsePageId } from 'notion-utils'

export type SiteLanguage = 'ko' | 'en'

export const defaultSiteLanguage: SiteLanguage = 'ko'

export const aboutPageIds: Record<SiteLanguage, string> = {
  ko: '38b210261e95805d8028c9f2ed6a863a',
  en: '38b210261e9580c1ab60e0cc8151cc4d'
}

const internalPropertyNames = new Set(['language', 'translation'])

function normalizeId(id: string): string {
  return id.replaceAll('-', '')
}

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return value === 'ko' || value === 'en'
}

export function getLanguageFromPath(asPath: string): SiteLanguage | undefined {
  const [pathAndQuery = '/'] = asPath.split('#')
  const [pathname = '/', query = ''] = pathAndQuery.split('?')
  const firstSegment = pathname
    .split('/')
    .find((segment) => segment.length > 0)
    ?.toLowerCase()

  if (isSiteLanguage(firstSegment)) {
    return firstSegment
  }

  const queryLanguage = new URLSearchParams(query).get('lang')?.toLowerCase()
  return isSiteLanguage(queryLanguage) ? queryLanguage : undefined
}

export function getPageBlock(
  recordMap: ExtendedRecordMap | undefined,
  pageId?: string
): Block | undefined {
  if (!recordMap) {
    return undefined
  }

  const normalizedPageId = pageId ? normalizeId(pageId) : undefined
  const blockId = normalizedPageId
    ? Object.keys(recordMap.block).find(
        (id) => normalizeId(id) === normalizedPageId
      )
    : Object.keys(recordMap.block)[0]

  return blockId ? recordMap.block[blockId]?.value : undefined
}

export function getPageLanguage(
  block: Block | undefined,
  recordMap: ExtendedRecordMap | undefined
): SiteLanguage | undefined {
  if (!block || !recordMap || block.parent_table !== 'collection') {
    return undefined
  }

  const value = getPageProperty<string>('Language', block, recordMap)
    ?.trim()
    .toLowerCase()

  return isSiteLanguage(value) ? value : undefined
}

function findRelatedPageId(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  if (value[0] === 'p' && typeof value[1] === 'string') {
    return parsePageId(value[1], { uuid: false })
  }

  return value.reduce<string | undefined>(
    (pageId, item) => pageId || findRelatedPageId(item),
    undefined
  )
}

export function getTranslationPageId(
  block: Block | undefined,
  recordMap: ExtendedRecordMap | undefined
): string | undefined {
  if (!block || !recordMap || block.parent_table !== 'collection') {
    return undefined
  }

  const collection = recordMap.collection[block.parent_id]?.value
  const propertyId = Object.keys(collection?.schema || {}).find(
    (id) => collection?.schema[id]?.name?.toLowerCase() === 'translation'
  )

  if (!propertyId) {
    return undefined
  }

  const properties = (block as PageBlock).properties as
    | Record<string, unknown>
    | undefined

  return findRelatedPageId(properties?.[propertyId])
}

export function isAboutPage(pageId: string | undefined): boolean {
  if (!pageId) {
    return false
  }

  const normalizedPageId = normalizeId(pageId)
  return Object.values(aboutPageIds).includes(normalizedPageId)
}

export function getLocalizedPagePath(
  language: SiteLanguage,
  pageId: string
): string {
  return isAboutPage(pageId)
    ? `/${language}/about`
    : `/${language}/${normalizeId(pageId)}`
}

export function hideInternalPageProperties(
  recordMap: ExtendedRecordMap
): ExtendedRecordMap {
  const hiddenPropertyIdsByCollection = new Map<string, Set<string>>()

  const collection = Object.fromEntries(
    Object.entries(recordMap.collection).map(([collectionId, record]) => {
      const hiddenPropertyIds = new Set(
        Object.entries(record?.value?.schema || {})
          .filter(([, schema]) =>
            internalPropertyNames.has(schema.name?.toLowerCase() || '')
          )
          .map(([propertyId]) => propertyId)
      )

      hiddenPropertyIdsByCollection.set(collectionId, hiddenPropertyIds)

      return [
        collectionId,
        record?.value
          ? {
              ...record,
              value: {
                ...record.value,
                schema: Object.fromEntries(
                  Object.entries(record.value.schema || {}).filter(
                    ([propertyId]) => !hiddenPropertyIds.has(propertyId)
                  )
                )
              }
            }
          : record
      ]
    })
  ) as ExtendedRecordMap['collection']

  const block = Object.fromEntries(
    Object.entries(recordMap.block).map(([blockId, record]) => {
      const value = record?.value
      const hiddenPropertyIds = value
        ? hiddenPropertyIdsByCollection.get(value.parent_id)
        : undefined

      if (!value || !hiddenPropertyIds?.size || !value.properties) {
        return [blockId, record]
      }

      return [
        blockId,
        {
          ...record,
          value: {
            ...value,
            properties: Object.fromEntries(
              Object.entries(value.properties).filter(
                ([propertyId]) => !hiddenPropertyIds.has(propertyId)
              )
            )
          }
        }
      ]
    })
  ) as ExtendedRecordMap['block']

  return { ...recordMap, block, collection }
}
