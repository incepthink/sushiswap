'use client'

import { createErrorToast } from '@sushiswap/notifications'
import { Button } from '@sushiswap/ui'
import { NetworkIcon } from '@sushiswap/ui/icons/NetworkIcon'
import React, { type FC, Suspense, useCallback } from 'react'
import type { NonStandardChainId } from 'src/config'
import { getNetworkName } from 'src/lib/network'
import { type EvmChainId, isEvmChainId } from 'sushi/chain'
import { ProviderRpcError, UserRejectedRequestError } from 'viem'
import { useChainId, useSwitchChain, useAccount } from 'wagmi'
import {
  NetworkSelector,
  type NetworkSelectorOnSelectCallback,
} from './network-selector'

type SupportedNetworks = readonly (EvmChainId | NonStandardChainId)[]

export const HeaderNetworkSelector: FC<{
  networks: SupportedNetworks
  supportedNetworks?: SupportedNetworks
  selectedNetwork?: EvmChainId | NonStandardChainId
  onChange?(network: EvmChainId | NonStandardChainId): void
  hideNetworkName?: boolean
  className?: string
}> = ({
  networks,
  supportedNetworks,
  selectedNetwork,
  onChange,
  className,
  hideNetworkName = false,
}) => {
  const { switchChainAsync } = useSwitchChain()
  const { isConnected, connector } = useAccount()
  const chainId = useChainId()

  console.log("NETDBG: DEBUG INFO:", {
    selectedNetwork,
    currentChainId: chainId,
    isConnected,
    hasSwitchChainAsync: !!switchChainAsync,
    connector: connector?.name,
  });
  
  const onSwitchNetwork = useCallback<NetworkSelectorOnSelectCallback>(
    async (el, close) => {
      console.log('NETDBG: ATTEMPTING NETWORK SWITCH:', {
        from: chainId,
        to: el,
        isConnected,
        hasSwitchChainAsync: !!switchChainAsync,
        connector: connector?.name
      })
      
      try {
        if (
          typeof el === 'number' &&
          isEvmChainId(el) &&
          switchChainAsync &&
          chainId !== el
        ) {
          console.log('NETDBG: Calling switchChainAsync...')
          try {
            await switchChainAsync({ chainId: el })
            console.log('NETDBG: Successfully switched MetaMask to chain', el)
          } catch (switchError) {
            console.error('NETDBG: switchChainAsync failed:', switchError)
            
            if (switchError instanceof UserRejectedRequestError) {
              console.log('NETDBG: User rejected network switch')
            } else if (switchError instanceof ProviderRpcError) {
              console.log('NETDBG: Provider error:', switchError.message)
              if (isConnected) {
                createErrorToast(switchError.message, true)
              }
            }
          }
        } else {
          console.log('NETDBG: Cannot switch network:', {
            isNumber: typeof el === 'number',
            isEvmChainId: isEvmChainId(Number(el)),
            hasSwitchChainAsync: !!switchChainAsync,
            sameChain: chainId === el
          })
        }

        // Always update app state
        if (selectedNetwork !== el && onChange) {
          console.log('NETDBG: Updating app state to network', el)
          onChange(el)
        }

        close()
      } catch (e) {
        console.error('NETDBG: Unexpected error in network switch:', e)
        if (e instanceof UserRejectedRequestError) return
        if (e instanceof ProviderRpcError && isConnected) {
          createErrorToast(e.message, true)
        }
      }
    },
    [chainId, onChange, selectedNetwork, switchChainAsync, isConnected, connector],
  )

  return (
    <NetworkSelector
      selected={selectedNetwork ?? chainId}
      supportedNetworks={supportedNetworks}
      onSelect={onSwitchNetwork}
      networks={networks}
    >
      <Button
        variant="secondary"
        testId="network-selector"
        className={className}
      >
        <Suspense fallback={null}>
          <NetworkIcon
            chainId={selectedNetwork ?? chainId}
            width={20}
            height={20}
          />
          {hideNetworkName ? null : (
            <div className="hidden xl:block">
              {getNetworkName(selectedNetwork ?? chainId)}
            </div>
          )}
        </Suspense>
      </Button>
    </NetworkSelector>
  )
}