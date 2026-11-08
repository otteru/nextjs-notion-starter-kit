import { type ExtendedRecordMap } from 'notion-types'
import { parsePageId, uuidToId } from 'notion-utils'

import { includeNotionIdInUrls } from './config'
import { getCanonicalPageId } from './get-canonical-page-id'
import {
  getLocalizedPagePath,
  getPageBlock,
  getPageLanguage
} from './site-language'
import { type Site } from './types'

// include UUIDs in page URLs during local development but not in production
// (they're nice for debugging and speed up local dev)
const uuid = !!includeNotionIdInUrls

export function getCanonicalPagePath(
  site: Site,
  recordMap: ExtendedRecordMap,
  pageId: string
): string {
  const pageUuid = parsePageId(pageId, { uuid: true })!

  if (uuidToId(pageUuid) === uuidToId(site.rootNotionPageId)) {
    return '/'
  }

  const language = getPageLanguage(getPageBlock(recordMap, pageUuid), recordMap)

  if (language) {
    return getLocalizedPagePath(language, pageUuid)
  }

  return `/${getCanonicalPageId(pageUuid, recordMap, { uuid })}`
}

export const mapPageUrl =
  (site: Site, recordMap: ExtendedRecordMap, searchParams: URLSearchParams) =>
  (pageId = '') =>
    createUrl(getCanonicalPagePath(site, recordMap, pageId), searchParams)

export const getCanonicalPageUrl =
  (site: Site, recordMap: ExtendedRecordMap) =>
  (pageId = '') =>
    `https://${site.domain}${getCanonicalPagePath(site, recordMap, pageId)}`

function createUrl(path: string, searchParams: URLSearchParams): string {
  return [path, searchParams.toString()].filter(Boolean).join('?')
}
