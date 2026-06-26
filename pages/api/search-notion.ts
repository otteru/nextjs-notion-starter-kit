import { type NextApiRequest, type NextApiResponse } from 'next'

import type * as types from '../../lib/types'
import { search } from '../../lib/notion'

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

export default async function searchNotion(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  const searchParams: types.SearchParams = req.body

  console.log('<<< lambda search-notion', searchParams)
  const results = normalizeSearchResults(await search(searchParams))
  console.log('>>> lambda search-notion', results)

  res.setHeader(
    'Cache-Control',
    'public, s-maxage=60, max-age=60, stale-while-revalidate=60'
  )
  res.status(200).json(results)
}
