import {
  type CollectionQueryResult,
  type ExtendedRecordMap,
  type PageBlock
} from 'notion-types'
import { getPageProperty } from 'notion-utils'

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
  propertyNames: string[]
): BlogCategory[] {
  const categoryCountMap = Object.values(recordMap.block).reduce(
    (acc, blockRecord) => {
      const block = blockRecord?.value

      if (block?.type !== 'page' || block.parent_table !== 'collection') {
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
  recordMap: ExtendedRecordMap
): BlogCategory[] {
  return getCategories(recordMap, partPropertyNames)
}

export function getProjectCategories(
  recordMap: ExtendedRecordMap
): BlogCategory[] {
  return getCategories(recordMap, projectPropertyNames)
}

function getMatchingPageIds(
  recordMap: ExtendedRecordMap,
  selectedValue: string,
  propertyNames: string[]
): Set<string> {
  return Object.values(recordMap.block).reduce((acc, blockRecord) => {
    const block = blockRecord?.value

    if (block?.type !== 'page' || block.parent_table !== 'collection') {
      return acc
    }

    const propertyValues = getPropertyValues(
      block as PageBlock,
      recordMap,
      propertyNames
    )

    if (propertyValues.includes(selectedValue)) {
      return new Set([...acc, normalizeId(block.id)])
    }

    return acc
  }, new Set<string>())
}

function filterBlockIds(
  blockIds: string[] | undefined,
  matchingPageIds: Set<string>
) {
  return (blockIds || []).filter((blockId) =>
    matchingPageIds.has(normalizeId(blockId))
  )
}

function filterCollectionQueryResult(
  queryResult: CollectionQueryResult,
  matchingPageIds: Set<string>
): CollectionQueryResult {
  const filteredBlockIds = filterBlockIds(queryResult.blockIds, matchingPageIds)

  return {
    ...queryResult,
    blockIds: filteredBlockIds,
    total: filteredBlockIds.length,
    groupResults: queryResult.groupResults?.map((groupResult) => ({
      ...groupResult,
      blockIds: filterBlockIds(groupResult.blockIds, matchingPageIds),
      total: filterBlockIds(groupResult.blockIds, matchingPageIds).length
    })),
    collection_group_results: queryResult.collection_group_results
      ? {
          ...queryResult.collection_group_results,
          blockIds: filterBlockIds(
            queryResult.collection_group_results.blockIds,
            matchingPageIds
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
              matchingPageIds
            )
          }
        }
      : undefined
  }
}

function filterRecordMapByProperty(
  recordMap: ExtendedRecordMap,
  selectedValue: string | undefined,
  propertyNames: string[]
): ExtendedRecordMap {
  if (!selectedValue) {
    return recordMap
  }

  const matchingPageIds = getMatchingPageIds(
    recordMap,
    selectedValue,
    propertyNames
  )

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
                filterCollectionQueryResult(queryResult, matchingPageIds)
              ]
            )
          )
        ]
      )
    )
  }
}

export function filterRecordMapByPart(
  recordMap: ExtendedRecordMap,
  selectedPart?: string
): ExtendedRecordMap {
  return filterRecordMapByProperty(recordMap, selectedPart, partPropertyNames)
}

export function filterRecordMapByProject(
  recordMap: ExtendedRecordMap,
  selectedProject?: string
): ExtendedRecordMap {
  return filterRecordMapByProperty(
    recordMap,
    selectedProject,
    projectPropertyNames
  )
}
