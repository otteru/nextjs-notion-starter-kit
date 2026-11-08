import type { GetServerSideProps } from 'next'

import type { SiteMap } from '@/lib/types'
import { getPublicPageIds } from '@/lib/get-public-page-ids'
import { getSiteMap } from '@/lib/get-site-map'
import { getCanonicalPageUrl } from '@/lib/map-page-url'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return {
      props: {}
    }
  }

  const siteMap = await getSiteMap()

  // cache for up to 8 hours
  res.setHeader(
    'Cache-Control',
    'public, max-age=28800, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')
  res.write(createSitemap(siteMap))
  res.end()

  return {
    props: {}
  }
}

const createSitemap = (siteMap: SiteMap): string => {
  const urls = [
    `https://${siteMap.site.domain}/`,
    ...getPublicPageIds(siteMap).map((pageId) =>
      getCanonicalPageUrl(siteMap.site, siteMap.pageMap[pageId]!)(pageId)
    )
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${[...new Set(urls)]
      .map((url) =>
        `
          <url>
            <loc>${escapeXml(url)}</loc>
          </url>
        `.trim()
      )
      .join('')}
  </urlset>
`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default function noop() {
  return null
}
