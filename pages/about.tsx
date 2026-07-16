import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps } from '@/lib/types'

export const getStaticProps = async () => {
  try {
    const props = await resolveNotionPage(domain, 'ko/about')
    return { props, revalidate: 10 }
  } catch (err) {
    console.error('legacy about page error', domain, err)
    throw err
  }
}

export default function LegacyAboutPage(props: PageProps) {
  return <NotionPage {...props} />
}
