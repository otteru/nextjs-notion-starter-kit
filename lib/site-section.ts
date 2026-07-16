import { type SiteLanguage } from './site-language'

export type SiteSection = 'blog' | 'project' | 'about'

export function getSiteSection(asPath: string): SiteSection {
  const [pathAndQuery = '/'] = asPath.split('#')
  const [pathname = '/', query = ''] = pathAndQuery.split('?')

  if (
    pathname.startsWith('/about') ||
    pathname.startsWith('/resume') ||
    /^\/(ko|en)\/about(?:\/|$)/.test(pathname)
  ) {
    return 'about'
  }

  const searchParams = new URLSearchParams(query)

  return searchParams.get('section') === 'project' ? 'project' : 'blog'
}

export function getSiteSectionPath(
  section: SiteSection,
  language: SiteLanguage = 'ko'
): string {
  if (section === 'about') {
    return `/${language}/about`
  }

  const searchParams = new URLSearchParams({ lang: language })

  if (section === 'project') {
    searchParams.set('section', 'project')
  }

  return `/?${searchParams.toString()}`
}
