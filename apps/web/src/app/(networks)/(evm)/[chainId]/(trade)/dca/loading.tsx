import { Container } from '@sushiswap/ui'
import React from 'react'

export default function SwapDCALoading() {
  return (
    <Container maxWidth="lg">
      <div className="flex items-center justify-center p-4 md:p-6 bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(25,32,49,0.8)] rounded-3xl backdrop-blur-2xl h-[100vh]">
        <div className="w-16 h-16 border-4 border-[#00FFE9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    </Container>
  )
}