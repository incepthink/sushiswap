'use client'

import type { Banner } from '@sushiswap/graph-client/strapi'
import type { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export function StrapiBannerContent({
  banner,
  cookie: _cookie,
  className,
}: { banner: Banner; cookie: RequestCookie | undefined; className?: string }) {
  return null
}
