import { useRouter } from 'next/router'
import * as React from 'react'

import { getSiteSection, type SiteSection } from './site-section'

export function useSiteSection(): SiteSection {
  const router = useRouter()
  const [section, setSection] = React.useState<SiteSection>(() =>
    getSiteSection(router.pathname)
  )

  React.useEffect(() => {
    if (!router.isReady) {
      return
    }

    setSection(getSiteSection(router.asPath))
  }, [router.asPath, router.isReady])

  return section
}
