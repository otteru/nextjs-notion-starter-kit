import { type NextApiRequest, type NextApiResponse } from 'next'
import { type ExtendedRecordMap } from 'notion-types'

import type * as types from '../../lib/types'
import { search } from '../../lib/notion'
import {
  getPageBlock,
  getPageLanguage,
  isSiteLanguage
} from '../../lib/site-language'

type RecordObject = Record<string, unknown>

function isRecordObject(value: unknown): value is RecordObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function unwrapRecord(record: unknown): unknown {
  if (!isRecordObject(record) || !isRecordObject(record.value)) {
    return record
  }

  if (!('value' in record.value)) {
    return record
  }

  return {
    ...record,
    value: record.value.value,
    role: record.role ?? record.value.role,
    spaceId: record.spaceId ?? record.value.spaceId
  }
}

function unwrapRecordTable(table: unknown): unknown {
  if (!isRecordObject(table)) {
    return table
  }

  return Object.fromEntries(
    Object.entries(table).map(([id, record]) => [id, unwrapRecord(record)])
  )
}

function normalizeSearchResults(
  results: types.SearchResults
): types.SearchResults {
  const recordMap = results.recordMap

  if (!isRecordObject(recordMap)) {
    return results
  }

  return {
    ...results,
    recordMap: Object.fromEntries(
      Object.entries(recordMap).map(([tableName, table]) => [
        tableName,
        unwrapRecordTable(table)
      ])
    ) as unknown as types.SearchResults['recordMap']
  }
}

function filterSearchResultsByLanguage(
  results: types.SearchResults,
  language: types.LocalizedSearchParams['language']
): types.SearchResults {
  if (!language) {
    return results
  }

  const recordMap = results.recordMap as ExtendedRecordMap
  const filteredResults = results.results.filter((result) => {
    const pageLanguage = getPageLanguage(
      getPageBlock(recordMap, result.id),
      recordMap
    )

    return !pageLanguage || pageLanguage === language
  })

  return {
    ...results,
    results: filteredResults,
    total: filteredResults.length
  }
}

export default async function searchNotion(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  const searchParams: types.LocalizedSearchParams = req.body
  const { language: requestedLanguage, ...notionSearchParams } = searchParams
  const language = isSiteLanguage(requestedLanguage)
    ? requestedLanguage
    : undefined

  console.log('<<< lambda search-notion', notionSearchParams)
  const results = filterSearchResultsByLanguage(
    normalizeSearchResults(await search(notionSearchParams)),
    language
  )
  console.log('>>> lambda search-notion', results)

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
  )
  res.status(200).json(results)
}
