import type { CodeBlock } from 'notion-types'
import cs from 'classnames'
import { getBlockTitle } from 'notion-utils'
import * as React from 'react'
import { Text, useNotionContext } from 'react-notion-x'

import styles from './MermaidCode.module.css'

interface MermaidCodeProps {
  block: CodeBlock
  className?: string
}

export function MermaidCode({ block, className }: MermaidCodeProps) {
  const { darkMode, recordMap } = useNotionContext()
  const code = getBlockTitle(block, recordMap)
  const caption = block.properties.caption
  const diagramId = React.useId().replaceAll(/[^a-zA-Z0-9_-]/g, '')
  const [svg, setSvg] = React.useState<string>()
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let isCancelled = false

    const renderDiagram = async () => {
      setSvg(undefined)
      setError(undefined)

      try {
        const { default: mermaid } = await import('mermaid')

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: darkMode ? 'dark' : 'neutral',
          flowchart: {
            useMaxWidth: true
          }
        })

        const result = await mermaid.render(`mermaid-${diagramId}`, code)

        if (!isCancelled) {
          setSvg(result.svg)
        }
      } catch (err) {
        console.warn('mermaid render error', err)

        if (!isCancelled) {
          setError('Mermaid diagram could not be rendered.')
        }
      }
    }

    void renderDiagram()

    return () => {
      isCancelled = true
    }
  }, [code, darkMode, diagramId])

  return (
    <>
      <figure className={cs(styles.container, className)}>
        {error ? (
          <>
            <p className={styles.errorMessage}>{error}</p>
            <pre className={styles.fallback}>
              <code>{code}</code>
            </pre>
          </>
        ) : svg ? (
          <div
            aria-label='Mermaid diagram'
            className={styles.diagram}
            dangerouslySetInnerHTML={{ __html: svg }}
            role='img'
          />
        ) : (
          <div className={styles.loading} role='status'>
            <span className={styles.srOnly}>Rendering Mermaid diagram</span>
          </div>
        )}
      </figure>

      {caption && (
        <figcaption className='notion-asset-caption'>
          <Text block={block} value={caption} />
        </figcaption>
      )}
    </>
  )
}
