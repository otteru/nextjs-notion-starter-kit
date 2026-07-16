export type SiteSection = 'blog' | 'project' | 'about'

export function getSiteSection(asPath: string): SiteSection {
  const [pathAndQuery = '/'] = asPath.split('#')
  const [pathname = '/', query = ''] = pathAndQuery.split('?')

  if (pathname.startsWith('/about') || pathname.startsWith('/resume')) {
    return 'about'
  }

  const searchParams = new URLSearchParams(query)

  return searchParams.get('section') === 'project' ? 'project' : 'blog'
}

export function getSiteSectionPath(section: SiteSection): string {
  if (section === 'about') {
    return '/about'
  }

  return section === 'project' ? '/?section=project' : '/'
}
