import {
  type CollectionQueryResult,
  type ExtendedRecordMap,
  type PageBlock
} from 'notion-types'
import { getPageProperty } from 'notion-utils'

import {
  getPageLanguage,
  isAboutPage,
  type SiteLanguage
} from './site-language'

export type BlogCategory = {
  name: string
  count: number
}

const partPropertyNames = ['파트', 'Part', '분야']
const projectPropertyNames = ['프로젝트', 'Project', 'project']

function toValues(value: unknown): string[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap(toValues)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeId(id: string): string {
  return id.replaceAll('-', '')
}

function getPropertyValues(
  block: PageBlock,
  recordMap: ExtendedRecordMap,
  propertyNames: string[]
): string[] {
  return Array.from(
    new Set(
      propertyNames.flatMap((propertyName) =>
        toValues(getPageProperty(propertyName, block, recordMap))
      )
    )
  )
}

export function getPartValues(
  block: PageBlock,
  recordMap: ExtendedRecordMap
): string[] {
  return getPropertyValues(block, recordMap, partPropertyNames)
}

function getCategories(
  recordMap: ExtendedRecordMap,
  propertyNames: string[],
  language: SiteLanguage
): BlogCategory[] {
  const categoryCountMap = Object.values(recordMap.block).reduce(
    (acc, blockRecord) => {
      const block = blockRecord?.value

      if (block?.type !== 'page' || block.parent_table !== 'collection') {
        return acc
      }

      if (
        isAboutPage(block.id) ||
        getPageLanguage(block, recordMap) !== language
      ) {
        return acc
      }

      const propertyValues = getPropertyValues(
        block as PageBlock,
        recordMap,
        propertyNames
      )

      return propertyValues.reduce(
        (nextAcc, propertyValue) => ({
          ...nextAcc,
          [propertyValue]: (nextAcc[propertyValue] || 0) + 1
        }),
        acc
      )
    },
    {} as Record<string, number>
  )

  return Object.keys(categoryCountMap)
    .toSorted((a, b) => a.localeCompare(b, 'en'))
    .map((name) => ({
      name,
      count: categoryCountMap[name]!
    }))
}

export function getBlogCategories(
  recordMap: ExtendedRecordMap,
  language: SiteLanguage = 'ko'
): BlogCategory[] {
  return getCategories(recordMap, partPropertyNames, language)
}

export function getProjectCategories(
  recordMap: ExtendedRecordMap,
  language: SiteLanguage = 'ko'
): BlogCategory[] {
  return getCategories(recordMap, projectPropertyNames, language)
}

function getMatchingPageIds(
  recordMap: ExtendedRecordMap,
  selectedValue: string | undefined,
  propertyNames: string[],
  includeUncategorizedWhenAll = false,
  language: SiteLanguage = 'ko'
): Set<string> {
  return Object.values(recordMap.block).reduce((acc, blockRecord) => {
    const block = blockRecord?.value

    if (block?.type !== 'page' || block.parent_table !== 'collection') {
      return acc
    }

    if (
      isAboutPage(block.id) ||
      getPageLanguage(block, recordMap) !== language
    ) {
      return acc
    }

    const propertyValues = getPropertyValues(
      block as PageBlock,
      recordMap,
      propertyNames
    )

    const isMatching = selectedValue
      ? propertyValues.includes(selectedValue)
      : includeUncategorizedWhenAll || propertyValues.length > 0

    if (isMatching) {
      return new Set([...acc, normalizeId(block.id)])
    }

    return acc
  }, new Set<string>())
}

function getPageTimestampMap(
  recordMap: ExtendedRecordMap
): ReadonlyMap<string, number> {
  return new Map(
    Object.values(recordMap.block).flatMap((blockRecord) => {
      const block = blockRecord?.value

      if (block?.type !== 'page' || block.parent_table !== 'collection') {
        return []
      }

      const publishedTime = getPageProperty<number>(
        'Published',
        block as PageBlock,
        recordMap
      )
      const timestamp = publishedTime || block.created_time

      return timestamp ? [[normalizeId(block.id), timestamp] as const] : []
    })
  )
}

function filterBlockIds(
  blockIds: string[] | undefined,
  matchingPageIds: Set<string>,
  pageTimestampMap: ReadonlyMap<string, number>
): string[] {
  return (blockIds || [])
    .filter((blockId) => matchingPageIds.has(normalizeId(blockId)))
    .toSorted((firstId, secondId) => {
      const firstTimestamp = pageTimestampMap.get(normalizeId(firstId))
      const secondTimestamp = pageTimestampMap.get(normalizeId(secondId))

      if (firstTimestamp === undefined && secondTimestamp === undefined) {
        return 0
      }

      if (firstTimestamp === undefined) {
        return 1
      }

      if (secondTimestamp === undefined) {
        return -1
      }

      return secondTimestamp - firstTimestamp
    })
}

function filterCollectionQueryResult(
  queryResult: CollectionQueryResult,
  matchingPageIds: Set<string>,
  pageTimestampMap: ReadonlyMap<string, number>
): CollectionQueryResult {
  const filteredBlockIds = filterBlockIds(
    queryResult.blockIds,
    matchingPageIds,
    pageTimestampMap
  )

  return {
    ...queryResult,
    blockIds: filteredBlockIds,
    total: filteredBlockIds.length,
    groupResults: queryResult.groupResults?.map((groupResult) => {
      const groupBlockIds = filterBlockIds(
        groupResult.blockIds,
        matchingPageIds,
        pageTimestampMap
      )

      return {
        ...groupResult,
        blockIds: groupBlockIds,
        total: groupBlockIds.length
      }
    }),
    collection_group_results: queryResult.collection_group_results
      ? {
          ...queryResult.collection_group_results,
          blockIds: filterBlockIds(
            queryResult.collection_group_results.blockIds,
            matchingPageIds,
            pageTimestampMap
          )
        }
      : undefined,
    reducerResults: queryResult.reducerResults?.collection_group_results
      ? {
          ...queryResult.reducerResults,
          collection_group_results: {
            ...queryResult.reducerResults.collection_group_results,
            blockIds: filterBlockIds(
              queryResult.reducerResults.collection_group_results.blockIds,
              matchingPageIds,
              pageTimestampMap
            )
          }
        }
      : undefined
  }
}

function filterRecordMapByProperty(
  recordMap: ExtendedRecordMap,
  selectedValue: string | undefined,
  propertyNames: string[],
  includeUncategorizedWhenAll = false,
  language: SiteLanguage = 'ko'
): ExtendedRecordMap {
  const matchingPageIds = getMatchingPageIds(
    recordMap,
    selectedValue,
    propertyNames,
    includeUncategorizedWhenAll,
    language
  )
  const pageTimestampMap = getPageTimestampMap(recordMap)

  return {
    ...recordMap,
    collection_query: Object.fromEntries(
      Object.entries(recordMap.collection_query).map(
        ([collectionId, collectionViews]) => [
          collectionId,
          Object.fromEntries(
            Object.entries(collectionViews).map(
              ([collectionViewId, queryResult]) => [
                collectionViewId,
                filterCollectionQueryResult(
                  queryResult,
                  matchingPageIds,
                  pageTimestampMap
                )
              ]
            )
          )
        ]
      )
    )
  }
}

export function getBlogPostCount(
  recordMap: ExtendedRecordMap,
  language: SiteLanguage = 'ko'
): number {
  return getMatchingPageIds(
    recordMap,
    undefined,
    partPropertyNames,
    true,
    language
  ).size
}

export function getProjectPostCount(
  recordMap: ExtendedRecordMap,
  language: SiteLanguage = 'ko'
): number {
  return getMatchingPageIds(
    recordMap,
    undefined,
    projectPropertyNames,
    false,
    language
  ).size
}

export function filterRecordMapByPart(
  recordMap: ExtendedRecordMap,
  selectedPart?: string,
  language: SiteLanguage = 'ko'
): ExtendedRecordMap {
  return filterRecordMapByProperty(
    recordMap,
    selectedPart,
    partPropertyNames,
    true,
    language
  )
}

export function filterRecordMapByProject(
  recordMap: ExtendedRecordMap,
  selectedProject?: string,
  language: SiteLanguage = 'ko'
): ExtendedRecordMap {
  return filterRecordMapByProperty(
    recordMap,
    selectedProject,
    projectPropertyNames,
    false,
    language
  )
}
