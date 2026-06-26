import { type ExtendedRecordMap, type RecordMap } from 'notion-types'

type NotionRecord = {
  value?: unknown
  [key: string]: unknown
}

type RecordMapSection = Record<string, NotionRecord>

function hasNestedValue(
  value: unknown
): value is { value?: unknown; [key: string]: unknown } {
  return !!value && typeof value === 'object' && 'value' in value
}

function normalizeRecord(record: NotionRecord): NotionRecord {
  if (hasNestedValue(record.value)) {
    return {
      ...record,
      value: record.value.value
    }
  }

  return record
}

function normalizeSection<T extends RecordMapSection | undefined>(
  section: T
): T {
  if (!section) {
    return section
  }

  return Object.fromEntries(
    Object.entries(section).map(([id, record]) => [id, normalizeRecord(record)])
  ) as T
}

export function normalizeRecordMap<T extends ExtendedRecordMap | RecordMap>(
  recordMap: T
): T {
  return {
    ...recordMap,
    block: normalizeSection(recordMap.block),
    collection: normalizeSection(recordMap.collection),
    collection_view: normalizeSection(recordMap.collection_view)
  }
}
