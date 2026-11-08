import { type ParsedUrlQuery } from 'node:querystring'

import { type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { getCanonicalPagePath } from '@/lib/map-page-url'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { isSiteLanguage } from '@/lib/site-language'
import { type PageProps } from '@/lib/types'

interface LocalizedPageParams extends ParsedUrlQuery {
  pageId: string
  localizedPageId: string
}

export const getStaticProps: GetStaticProps<
  PageProps,
  LocalizedPageParams
> = async (context) => {
  const language = context.params?.pageId.toLowerCase()
  const routePageId = context.params?.localizedPageId

  if (!isSiteLanguage(language) || !routePageId) {
    return { notFound: true }
  }

  const rawPageId = routePageId === 'about' ? `${language}/about` : routePageId

  try {
    const props = await resolveNotionPage(domain, rawPageId)
    if (props.error?.statusCode === 404) {
      return { notFound: true, revalidate: 3600 }
    }

    if (!props.error && props.site && props.recordMap && props.pageId) {
      const destination = getCanonicalPagePath(
        props.site,
        props.recordMap,
        props.pageId
      )

      if (destination !== `/${context.params?.pageId}/${routePageId}`) {
        return {
          redirect: { destination, permanent: true },
          revalidate: 3600
        }
      }
    }

    return { props, revalidate: 3600 }
  } catch (err) {
    console.error('localized page error', domain, language, routePageId, err)
    throw err
  }
}

export function getStaticPaths() {
  return {
    paths: [
      { params: { pageId: 'ko', localizedPageId: 'about' } },
      { params: { pageId: 'en', localizedPageId: 'about' } }
    ],
    fallback: 'blocking'
  }
}

export default function LocalizedNotionPage(props: PageProps) {
  return <NotionPage {...props} />
}
