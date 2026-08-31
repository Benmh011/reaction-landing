'use client'

import { useMemo, useRef, useState } from 'react'
import { buildSignatureHtml, buildSignatureText } from '../../lib/signature'

export default function SignatureClient() {
  const [status, setStatus] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const html = useMemo(() => buildSignatureHtml(), [])
  const text = useMemo(() => buildSignatureText(), [])

  function selectPreviewFallback() {
    const node = previewRef.current
    if (!node) return false
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    const ok = document.execCommand('copy')
    selection?.removeAllRanges()
    return ok
  }

  async function handleCopy() {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([item])
      setStatus('Copied — paste into your mail client signature box.')
      return
    } catch {
      const ok = selectPreviewFallback()
      setStatus(
        ok
          ? 'Copied — paste into your mail client signature box.'
          : 'Copy failed. Select the preview manually and press Ctrl+C.',
      )
    }
  }

  async function handleCopyRaw() {
    try {
      await navigator.clipboard.writeText(html)
      setStatus('Raw HTML copied.')
    } catch {
      setStatus('Copy failed. Select the HTML below and press Ctrl+C.')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F5F0',
        color: '#0F1113',
        fontFamily: "Helvetica,Arial,'Segoe UI',sans-serif",
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#5A5F66',
            margin: '0 0 8px 0',
          }}
        >
          Internal · not indexed
        </p>
        <h1
          style={{
            fontFamily: "Georgia,'Times New Roman',Times,serif",
            fontSize: 30,
            lineHeight: '36px',
            margin: '0 0 8px 0',
            fontWeight: 700,
          }}
        >
          Email signature
        </h1>
        <p style={{ fontSize: 14, lineHeight: '22px', color: '#5A5F66', margin: '0 0 28px 0' }}>
          Copy this, then paste it into the signature box in Gmail, Outlook or Apple Mail.
          Paste once — it stays embedded in your client and renders everywhere.
        </p>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DAD5CA',
            padding: 28,
            marginBottom: 20,
          }}
        >
          <div ref={previewRef} dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              backgroundColor: '#0F1113',
              color: '#F7F5F0',
              border: 0,
              borderRadius: 2,
              padding: '11px 18px',
              fontSize: 13,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            Copy signature
          </button>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            style={{
              backgroundColor: 'transparent',
              color: '#0F1113',
              border: '1px solid #DAD5CA',
              borderRadius: 2,
              padding: '11px 18px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {showRaw ? 'Hide HTML' : 'Show HTML'}
          </button>
          {status ? <span style={{ fontSize: 13, color: '#B0894F' }}>{status}</span> : null}
        </div>

        {showRaw ? (
          <div style={{ marginTop: 20 }}>
            <textarea
              readOnly
              value={html}
              rows={12}
              style={{
                width: '100%',
                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                fontSize: 12,
                lineHeight: '18px',
                padding: 14,
                border: '1px solid #DAD5CA',
                borderRadius: 2,
                backgroundColor: '#FFFFFF',
                color: '#0F1113',
              }}
            />
            <button
              type="button"
              onClick={handleCopyRaw}
              style={{
                marginTop: 10,
                backgroundColor: 'transparent',
                color: '#0F1113',
                border: '1px solid #DAD5CA',
                borderRadius: 2,
                padding: '9px 16px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Copy raw HTML
            </button>
          </div>
        ) : null}
      </div>
    </main>
  )
}
