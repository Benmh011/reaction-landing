import type { Metadata } from 'next'
import SignatureClient from './SignatureClient'

export const metadata: Metadata = {
  title: 'Signature · Reaction',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function SignaturePage() {
  return <SignatureClient />
}
