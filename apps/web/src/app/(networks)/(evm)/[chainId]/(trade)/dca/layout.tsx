import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TWAP_SUPPORTED_CHAIN_IDS, isTwapSupportedChainId } from 'src/config'
import type { ChainId } from 'sushi/chain'
import { Header } from '../header'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'DCA',
  description:
    "Dollar-cost average into your favorite tokens with SushiSwap's DCA tool.",
}

export default async function SwapDCALayout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params
  const { children } = props
  const chainId = +params.chainId as ChainId

  if (!isTwapSupportedChainId(chainId)) {
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
      <Header chainId={chainId} supportedNetworks={TWAP_SUPPORTED_CHAIN_IDS} />
      <main className="lg:p-4 -mt-2 mb-[86px]">{children}</main>
    </Providers>
  )
}
