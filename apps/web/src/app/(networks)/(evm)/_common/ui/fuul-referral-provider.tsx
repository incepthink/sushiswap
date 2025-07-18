'use client'

import { type FC } from 'react'

interface FuulReferralProviderProps {
  children: React.ReactNode
}

export const FuulReferralProvider: FC<FuulReferralProviderProps> = ({
  children,
}) => {
  // Completely disabled - just pass through children
  return <>{children}</>
}