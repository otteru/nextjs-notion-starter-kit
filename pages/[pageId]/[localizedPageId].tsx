import { type ParsedUrlQuery } from 'node:querystring'

import { type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import {
  getLocalizedPagePath,
  getPageBlock,
  getPageLanguage,
  isSiteLanguage
} from '@/lib/site-language'
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
    const actualLanguage = getPageLanguage(
      getPageBlock(props.recordMap, props.pageId),
      props.recordMap
    )

    if (actualLanguage && actualLanguage !== language && props.pageId) {
      return {
        redirect: {
          destination: getLocalizedPagePath(actualLanguage, props.pageId),
          permanent: false
        }
      }
    }

    return { props, revalidate: 10 }
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
