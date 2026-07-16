import * as React from 'react'

import { type BlogCategory } from '@/lib/blog-categories'

import styles from './BlogCategorySidebar.module.css'

export function BlogCategorySidebar({
  title = 'Part',
  categories,
  allCount,
  activeCategory,
  onSelectCategory
}: {
  title?: string
  categories: BlogCategory[]
  allCount: number
  activeCategory?: string
  onSelectCategory: (category?: string) => void
}) {
  if (!categories.length) {
    return null
  }

  return (
    <aside className={styles.sidebar} aria-label={`${title} categories`}>
      <p className={styles.title}>{title}</p>

      <div className={styles.list}>
        <button
          type='button'
          className={`${styles.button} ${activeCategory === undefined ? styles.active : ''}`}
          aria-pressed={activeCategory === undefined}
          onClick={() => onSelectCategory(undefined)}
        >
          <span>All</span>
          <span className={styles.count}>{allCount}</span>
        </button>

        {categories.map((category) => {
          const isActive = category.name === activeCategory

          return (
            <button
              key={category.name}
              type='button'
              className={`${styles.button} ${isActive ? styles.active : ''}`}
              aria-pressed={isActive}
              onClick={() => onSelectCategory(category.name)}
            >
              <span>{category.name}</span>
              <span className={styles.count}>{category.count}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
