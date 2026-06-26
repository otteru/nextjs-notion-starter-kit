import {
  type ExtendedRecordMap,
  type PageChunk,
  type RecordMap
} from 'notion-types'
import { getBlockCollectionId, getPageContentBlockIds } from 'notion-utils'
import pMap from 'p-map'

import { normalizeRecordMap } from './normalize-record-map'

type GetPageOptions = {
  concurrency?: number
  fetchMissingBlocks?: boolean
  fetchCollections?: boolean
  signFileUrls?: boolean
  chunkLimit?: number
  chunkNumber?: number
  collectionReducerLimit?: number
  fetchRelationPages?: boolean
  ofetchOptions?: any
  kyOptions?: any
}

type NotionPageClient = {
  getPageRaw: (
    pageId: string,
    options?: Pick<GetPageOptions, 'chunkLimit' | 'chunkNumber' | 'ofetchOptions'>
  ) => Promise<PageChunk>
  getBlocks: (
    blockIds: string[],
    ofetchOptions?: any
  ) => Promise<PageChunk>
  getCollectionData: (
    collectionId: string,
    collectionViewId: string,
    collectionView?: any,
    options?: { limit?: number; ofetchOptions?: any }
  ) => Promise<{
    recordMap: ExtendedRecordMap | RecordMap
    result?: { reducerResults?: any }
  }>
  addSignedUrls: (options: {
    recordMap: ExtendedRecordMap
    contentBlockIds?: string[]
    ofetchOptions?: any
  }) => Promise<void>
  fetchRelationPages: (
    recordMap: ExtendedRecordMap,
    ofetchOptions?: any
  ) => Promise<ExtendedRecordMap['block']>
}

function mergeRecordMap(
  recordMap: ExtendedRecordMap,
  newRecordMap: ExtendedRecordMap | RecordMap
): ExtendedRecordMap {
  return {
    ...recordMap,
    block: { ...recordMap.block, ...newRecordMap.block },
    collection: { ...recordMap.collection, ...newRecordMap.collection },
    collection_view: {
      ...recordMap.collection_view,
      ...newRecordMap.collection_view
    },
    notion_user: { ...recordMap.notion_user, ...newRecordMap.notion_user }
  }
}

async function fetchMissingBlocks(
  notion: NotionPageClient,
  recordMap: ExtendedRecordMap,
  ofetchOptions?: any
): Promise<ExtendedRecordMap> {
  let nextRecordMap = recordMap

  while (true) {
    const blockMap = nextRecordMap.block
    const pendingBlockIds = getPageContentBlockIds(nextRecordMap).filter(
      (id) => !blockMap[id]
    )

    if (!pendingBlockIds.length) {
      return nextRecordMap
    }

    const pageChunk = await notion.getBlocks(pendingBlockIds, ofetchOptions)
    nextRecordMap = mergeRecordMap(
      nextRecordMap,
      normalizeRecordMap(pageChunk.recordMap)
    )
  }
}

async function fetchCollections(
  notion: NotionPageClient,
  recordMap: ExtendedRecordMap,
  {
    concurrency,
    collectionReducerLimit,
    ofetchOptions
  }: Required<Pick<GetPageOptions, 'concurrency' | 'collectionReducerLimit'>> &
    Pick<GetPageOptions, 'ofetchOptions'>
): Promise<ExtendedRecordMap> {
  const collectionQueries = { ...recordMap.collection_query }
  let nextRecordMap = recordMap

  const collectionInstances = getPageContentBlockIds(recordMap).flatMap(
    (blockId) => {
      const block = recordMap.block[blockId]?.value
      const collectionId =
        block &&
        (block.type === 'collection_view' ||
          block.type === 'collection_view_page') &&
        getBlockCollectionId(block, recordMap)

      return collectionId
        ? (block.view_ids || []).map((collectionViewId) => ({
            collectionId,
            collectionViewId
          }))
        : []
    }
  )

  await pMap(
    collectionInstances,
    async ({ collectionId, collectionViewId }) => {
      const collectionView = recordMap.collection_view[collectionViewId]?.value
      const collectionData = await notion.getCollectionData(
        collectionId,
        collectionViewId,
        collectionView,
        { limit: collectionReducerLimit, ofetchOptions }
      )

      nextRecordMap = mergeRecordMap(
        nextRecordMap,
        normalizeRecordMap(collectionData.recordMap)
      )

      if (collectionData.result?.reducerResults) {
        collectionQueries[collectionId] = {
          ...collectionQueries[collectionId],
          [collectionViewId]: collectionData.result.reducerResults
        }
      }
    },
    { concurrency }
  )

  return { ...nextRecordMap, collection_query: collectionQueries }
}

export async function getNormalizedPage(
  notion: NotionPageClient,
  pageId: string,
  {
    concurrency = 3,
    fetchMissingBlocks: shouldFetchMissingBlocks = true,
    fetchCollections: shouldFetchCollections = true,
    signFileUrls = true,
    chunkLimit = 100,
    chunkNumber = 0,
    collectionReducerLimit = 999,
    fetchRelationPages = false,
    ofetchOptions,
    kyOptions
  }: GetPageOptions = {}
): Promise<ExtendedRecordMap> {
  const page = await notion.getPageRaw(pageId, {
    chunkLimit,
    chunkNumber,
    ofetchOptions: ofetchOptions ?? kyOptions
  })
  const initialRecordMap = normalizeRecordMap(page.recordMap)

  let recordMap: ExtendedRecordMap = {
    ...initialRecordMap,
    collection: initialRecordMap.collection ?? {},
    collection_view: initialRecordMap.collection_view ?? {},
    collection_query: {},
    notion_user: initialRecordMap.notion_user ?? {},
    signed_urls: {}
  }

  if (shouldFetchMissingBlocks) {
    recordMap = await fetchMissingBlocks(notion, recordMap, ofetchOptions)
  }

  const contentBlockIds = getPageContentBlockIds(recordMap)

  if (shouldFetchCollections) {
    recordMap = await fetchCollections(notion, recordMap, {
      concurrency,
      collectionReducerLimit,
      ofetchOptions
    })
  }

  if (signFileUrls) {
    await notion.addSignedUrls({ recordMap, contentBlockIds, ofetchOptions })
  }

  if (fetchRelationPages) {
    const newBlocks = await notion.fetchRelationPages(recordMap, ofetchOptions)
    recordMap = { ...recordMap, block: { ...recordMap.block, ...newBlocks } }
  }

  return recordMap
}
