import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { XSWAP_SUPPORTED_CHAIN_IDS, isXSwapSupportedChainId } from 'src/config'
import type { EvmChainId } from 'sushi/chain'
import { Header } from '../header'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Cross-Chain Swap',
  description:
    'Swap assets across multiple blockchains with ease using Cross-Chain Swap. Enjoy secure, seamless cross-chain swaps for a streamlined DeFi experience on Sushi.com.',
}

export default async function CrossChainSwapLayout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params
  const { children } = props
  const chainId = +params.chainId as EvmChainId

  if (!isXSwapSupportedChainId(chainId)) {
    return notFound()
  }

  return (
    <Providers chainId={chainId}>
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
      <Header chainId={chainId} supportedNetworks={XSWAP_SUPPORTED_CHAIN_IDS} />
      <main className="lg:p-4 mb-[86px] h-[clamp(600px,_calc(100vh_-_280px),_800px)]">
        {children}
      </main>
    </Providers>
  )
}
