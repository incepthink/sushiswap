import '@sushiswap/ui/index.css'

import { ToastContainer } from '@sushiswap/notifications'
import type { Metadata } from 'next'
import { Inter, Roboto_Mono } from 'next/font/google'
import type React from 'react'
import { CookieDialogContainer } from './_common/cookies/cookie-dialog-container'
import { Trackers } from './trackers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'AggTrade - Spot',
    template: 'AggTrade - Spot',
  },
  description:
    'A Decentralised Finance (DeFi) app with features such as swap, cross chain swap, streaming, vesting, and permissionless market making for liquidity providers.',
  icons: {
    apple: '/apple-touch-icon.png?v=1',
    icon: '/favicon-32x-32.png?v=1',
    shortcut: '/favicon-16x-16.png?v=1',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://cdn.sushi.com/image/upload/v1731498183/sushi-assets/embed-web-visuals/default.jpg',
        width: 1920,
        height: 1080,
        alt: 'Sushi 🍣',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto_mono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/site.webmanifest?v=1" />
        <link
          rel="mask-icon"
          href="/safari-pinned-tab.svg?v=1"
          color="#fa52a0"
        />
        <link rel="shortcut icon" href="/favicon.ico?v=1" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ToastContainer />
        <CookieDialogContainer />
        {children}
        <Trackers />
      </body>
    </html>
  )
}
