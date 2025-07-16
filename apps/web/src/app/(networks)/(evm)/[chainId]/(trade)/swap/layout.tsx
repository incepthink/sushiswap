import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSupportedChainId } from 'src/config'
import type { ChainId } from 'sushi/chain'
import { Header } from '../header'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Swap',
  description:
    'Trade crypto effortlessly with SushiSwap, supporting over 30 chains and featuring a powerful aggregator for the best rates across DeFi.',
}

export default async function SwapLayout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params
  const { children } = props
  const chainId = +params.chainId as ChainId

  if (!isSupportedChainId) {
    return notFound()
  }

  return (
    <Providers>
      <div className="fixed inset-0 -z-9 overflow-hidden">
              {/* <video
                className="w-full h-full object-cover"
                src="/assets/home.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              /> */}
              <img
                src="/assets/ellipse-home.png"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
      <Header chainId={chainId} />
      <main className="lg:p-4 -mt-2 mb-[86px]">{children}</main>
    </Providers>
  )
}
