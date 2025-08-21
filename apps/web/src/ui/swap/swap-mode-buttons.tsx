'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@sushiswap/ui'
import { ShuffleIcon } from '@sushiswap/ui/icons/ShuffleIcon'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'
import {
  isSupportedChainId,
  isTwapSupportedChainId,
  isXSwapSupportedChainId,
} from 'src/config'
import { ChainKey, type EvmChainId } from 'sushi/chain'

// Icons for each tab (you can replace these with actual icons from your icon library)
const SwapIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
  </svg>
)

const LimitIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z" />
  </svg>
)

const DCAIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L15.09 8.26L22 9L15.09 9.74L12 16L8.91 9.74L2 9L8.91 8.26L12 2Z" />
  </svg>
)

export const SwapModeButtons = () => {
  const { chainId: _chainId } = useParams()
  const pathname = usePathname()
  const chainId = +_chainId! as EvmChainId

  const swapTabs = useMemo(() => [
    {
      id: 'swap',
      label: 'Instant',
      icon: <SwapIcon />,
      description: 'Trade tokens instantly at market prices',
      path: `/${ChainKey[chainId]}/swap`,
      isSupported: isSupportedChainId(chainId),
    },
    {
      id: 'limit',
      label: 'Trigger',
      icon: <LimitIcon />,
      description: 'Set custom prices for your trades',
      path: `/${ChainKey[chainId]}/limit`,
      isSupported: isTwapSupportedChainId(chainId),
    },
    {
      id: 'dca',
      label: 'Recurring',
      icon: <DCAIcon />,
      description: 'Dollar-cost average into your favorite tokens',
      path: `/${ChainKey[chainId]}/dca`,
      isSupported: isTwapSupportedChainId(chainId),
    },
    // {
    //   id: 'cross-chain',
    //   label: 'Bridge',
    //   icon: <ShuffleIcon width={16} height={16} className="text-current" />,
    //   description: 'Swap tokens across 15+ different blockchain networks',
    //   path: `/${ChainKey[chainId]}/cross-chain-swap`,
    //   isSupported: isXSwapSupportedChainId(chainId),
    // },
  ], [chainId])

  // Determine active tab based on current pathname
  const activeTab = useMemo(() => {
    const currentPath = pathname.split('/').pop()
    return swapTabs.find(tab => tab.path.includes(currentPath || ''))?.id || 'swap'
  }, [pathname, swapTabs])

  const TabButton = ({ tab }: { tab: typeof swapTabs[0] }) => {
    const isActive = activeTab === tab.id
    const buttonContent = (
      <button
        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[#00F5E0] text-black shadow-lg"
            : tab.isSupported
            ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
            : "text-gray-600 cursor-not-allowed opacity-50"
        }`}
        disabled={!tab.isSupported}
      >
        {tab.id === 'cross-chain' ? (
          <span className={`flex items-center space-x-2 ${
            isActive ? '' : 'saturate-200 bg-gradient-to-r from-blue to-pink bg-clip-text text-transparent'
          }`}>
            {/* {tab.icon} */}
            <span>{tab.label}</span>
          </span>
        ) : (
          <>
            {/* {tab.icon} */}
            <span>{tab.label}</span>
          </>
        )}
      </button>
    )

    if (!tab.isSupported) {
      return (
        <div className="flex-1">
          <HoverCard>
            <HoverCardTrigger asChild>
              {buttonContent}
            </HoverCardTrigger>
            <HoverCardContent className="!px-3 !py-1.5 text-xs">
              Not supported on this network
            </HoverCardContent>
          </HoverCard>
        </div>
      )
    }

    return (
      <div className="flex-1">
        <Link href={tab.path}>
          {buttonContent}
        </Link>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* Tab Navigation */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm w-full justify-between">
        {swapTabs.map((tab) => (
          <TabButton key={tab.id} tab={tab} />
        ))}
      </div>

      {/* Tab Description */}
      {/* <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          {swapTabs.find((tab) => tab.id === activeTab)?.description}
        </p>
      </div> */}
    </div>
  )
}