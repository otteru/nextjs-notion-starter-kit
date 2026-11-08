import { getPageProperty } from 'notion-utils'

import { getPageBlock } from './site-language'
import { type SiteMap } from './types'

export function getPublicPageIds({ pageMap }: SiteMap): string[] {
  return Object.entries(pageMap)
    .filter(([pageId, recordMap]) => {
      if (!recordMap) return false

      const block = getPageBlock(recordMap, pageId)
      return (
        !!block &&
        (getPageProperty<boolean | null>('Public', block, recordMap) ?? true)
      )
    })
    .map(([pageId]) => pageId)
}
