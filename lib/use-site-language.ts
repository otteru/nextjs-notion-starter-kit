import { useRouter } from 'next/router'
import { type ExtendedRecordMap } from 'notion-types'
import * as React from 'react'

import {
  defaultSiteLanguage,
  getLanguageFromPath,
  getPageBlock,
  getPageLanguage,
  type SiteLanguage
} from './site-language'

export function useSiteLanguage(
  recordMap?: ExtendedRecordMap,
  pageId?: string
): SiteLanguage {
  const router = useRouter()

  return React.useMemo(
    () =>
      getLanguageFromPath(router.asPath) ||
      getPageLanguage(getPageBlock(recordMap, pageId), recordMap) ||
      defaultSiteLanguage,
    [pageId, recordMap, router.asPath]
  )
}
