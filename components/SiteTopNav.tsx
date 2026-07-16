import Image from 'next/image'
import { useRouter } from 'next/router'
import { type Block, type ExtendedRecordMap } from 'notion-types'
import { getBlockIcon, isUrl } from 'notion-utils'
import * as React from 'react'

import { rootNotionPageId } from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import {
  getSiteSection,
  getSiteSectionPath,
  type SiteSection
} from '@/lib/site-section'
import { type PageProps } from '@/lib/types'

import styles from './SiteTopNav.module.css'

type NavItem = {
  id: SiteSection
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'blog',
    label: 'Blog',
    icon: (
      <path
        d='M5 4.75A1.75 1.75 0 0 1 6.75 3h7.5A1.75 1.75 0 0 1 16 4.75v10.5A1.75 1.75 0 0 1 14.25 17h-7.5A1.75 1.75 0 0 1 5 15.25V4.75Zm3 2.5h5M8 10h5M8 12.75h3'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.7'
      />
    )
  },
  {
    id: 'project',
    label: 'Project',
    icon: (
      <path
        d='M4 7.25A2.25 2.25 0 0 1 6.25 5h2.1l1.35 1.5h4.05A2.25 2.25 0 0 1 16 8.75v4A2.25 2.25 0 0 1 13.75 15h-7.5A2.25 2.25 0 0 1 4 12.75v-5.5Z'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.7'
      />
    )
  },
  {
    id: 'about',
    label: 'About Me',
    icon: (
      <path
        d='M10 10.25a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM5.5 16a4.5 4.5 0 0 1 9 0'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.7'
      />
    )
  }
]

const brandFallbackIcon =
  'https://www.notion.so/image/attachment%3Acd72c5bd-4317-45dc-a0a9-61262a752329%3Aimage.png?table=block&id=27f21026-1e95-8069-953e-d9a1aa6a8269&cache=v2'

function getRootBlock(recordMap?: ExtendedRecordMap): Block | undefined {
  const blockId =
    Object.keys(recordMap?.block || {}).find(
      (id) => id.replaceAll('-', '') === rootNotionPageId
    ) || Object.keys(recordMap?.block || {})[0]

  return blockId ? recordMap?.block?.[blockId]?.value : undefined
}

function getBrandIcon(block?: Block, recordMap?: ExtendedRecordMap) {
  if (!block || !recordMap) {
    return { type: 'image' as const, src: brandFallbackIcon }
  }

  const icon = getBlockIcon(block, recordMap)

  if (!icon) {
    return { type: 'image' as const, src: brandFallbackIcon }
  }

  if (isUrl(icon)) {
    const imageUrl = mapImageUrl(icon, block)

    return imageUrl
      ? { type: 'image' as const, src: imageUrl }
      : { type: 'image' as const, src: brandFallbackIcon }
  }

  return {
    type: 'text' as const,
    value: icon
  }
}

function openSearch() {
  window.dispatchEvent(new CustomEvent('yudam:open-search'))
}

export function SiteTopNav({ recordMap }: Pick<PageProps, 'recordMap'>) {
  const router = useRouter()
  const rootBlock = React.useMemo(() => getRootBlock(recordMap), [recordMap])
  const brandIcon = React.useMemo(
    () => getBrandIcon(rootBlock, recordMap),
    [rootBlock, recordMap]
  )
  const activeTab = getSiteSection(router.asPath)

  return (
    <nav className={styles.topNav} aria-label='Primary navigation'>
      <div className={styles.inner}>
        <div className={styles.leftArea}>
          <div className={styles.brand}>
            {brandIcon?.type === 'image' ? (
              <Image
                className={styles.brandMark}
                src={brandIcon.src}
                alt=''
                width={38}
                height={38}
                priority
              />
            ) : (
              <span className={styles.brandMarkText} aria-hidden='true'>
                {brandIcon?.type === 'text' ? brandIcon.value : 'Y'}
              </span>
            )}

            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Yudam&apos;s Blog</span>
            </div>
          </div>
        </div>

        <div className={styles.tabs} role='tablist' aria-label='Sections'>
          {navItems.map((item) => {
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type='button'
                className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                role='tab'
                aria-selected={isActive}
                onClick={() => {
                  const tabPath = getSiteSectionPath(item.id)

                  if (router.asPath !== tabPath) {
                    void router.push(tabPath)
                  }
                }}
              >
                <svg
                  className={styles.tabIcon}
                  viewBox='0 0 20 20'
                  aria-hidden='true'
                >
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.rightArea}>
          <button
            type='button'
            className={styles.searchButton}
            onClick={openSearch}
            aria-label='Search blog'
          >
            <svg
              className={styles.searchIcon}
              viewBox='0 0 20 20'
              aria-hidden='true'
            >
              <path
                d='m14.2 14.2 2.3 2.3M8.9 15.1a6.2 6.2 0 1 1 0-12.4 6.2 6.2 0 0 1 0 12.4Z'
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.8'
              />
            </svg>
            <span>Search</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
