import * as React from 'react'

import { type BlogCategory } from '@/lib/blog-categories'

import styles from './BlogCategorySidebar.module.css'

export function BlogCategorySidebar({
  title = 'Part',
  categories,
  activeCategory,
  onSelectCategory
}: {
  title?: string
  categories: BlogCategory[]
  activeCategory?: string
  onSelectCategory: (category: string) => void
}) {
  if (!categories.length) {
    return null
  }

  return (
    <aside className={styles.sidebar} aria-label='Blog categories'>
      <p className={styles.title}>{title}</p>

      <div className={styles.list}>
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
