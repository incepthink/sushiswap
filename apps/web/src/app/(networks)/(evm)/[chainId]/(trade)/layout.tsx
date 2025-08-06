import Image from 'next/image'
import { ChainId } from 'sushi'
import { Providers } from './providers'

export default async function TradeLayout(props: {
  children: React.ReactNode
  params: Promise<{ chainId: string }>
}) {
  const params = await props.params
  const { children } = props
  const chainId = +params.chainId as ChainId
  return (
    <Providers>
      {chainId === ChainId.KATANA ? <KatanaBackground /> : null}
      {children}
    </Providers>
  )
}

const KatanaBackground = () => {
  return (
    <div className="fixed inset-0 -z-10">
      
    </div>
  )
}
