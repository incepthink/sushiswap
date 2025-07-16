'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'

import ms from 'ms'
import { NativeAddress } from 'src/lib/constants'
import { publicWagmiConfig } from 'src/lib/wagmi/config/public'
import { type EvmChainId, LowercaseMap } from 'sushi'
import { erc20Abi_balanceOf, multicall3Abi_getEthBalance } from 'sushi/abi'
import type { Address } from 'viem'
import { multicall } from 'viem/actions'
import { useAccount, useConfig } from 'wagmi'
import type {
  Balance,
  Provider,
  ProviderActions,
  ProviderMutations,
  ProviderState,
  TokenId,
} from './types'
import { getTokenIds, isBalanceStale } from './utils'

function getOrCreateChain(state: ProviderState, chainId: EvmChainId) {
  let chain = state.chains.get(chainId)

  if (!chain) {
    const newChain = {
      chainId,
      isFetching: false,
      activeTokens: new LowercaseMap<Address, number>(),
      balanceMap: new LowercaseMap<Address, Balance>(),
    }

    state.chains.set(chainId, newChain)
    chain = state.chains.get(chainId)
  }

  return chain!
}

/*
  This reducer and the surrounding hooks have been written in mind with the fact
  that the references of sets and maps inside of the state do not change, only the
  state object itself.
*/
function reducer(state: ProviderState, action: ProviderActions): ProviderState {
  switch (action.type) {
    case 'INCREMENT_TOKEN': {
      const tokenIds = getTokenIds(action.payload)

      if (tokenIds.length === 0) return state

      tokenIds.forEach((tokenId) => {
        const { chainId, address } = tokenId

        const chain = getOrCreateChain(state, chainId)

        const currentListenerCount = chain.activeTokens.get(address) || 0
        chain.activeTokens.set(address, currentListenerCount + 1)
      })

      return {
        ...state,
      }
    }
    case 'DECREMENT_TOKEN': {
      const tokenIds = getTokenIds(action.payload)

      if (tokenIds.length === 0) return state

      tokenIds.forEach((tokenId) => {
        const { chainId, address } = tokenId

        const chain = getOrCreateChain(state, chainId)

        const currentListenerCount = chain.activeTokens.get(address) || 0

        if (currentListenerCount === 0) return

        if (currentListenerCount === 1) {
          chain.balanceMap.delete(address)
        } else {
          chain.activeTokens.set(address, currentListenerCount - 1)
        }
      })

      return {
        ...state,
      }
    }
    case 'UPDATE_ACCOUNT': {
      state.chains.forEach((chain) => {
        chain.balanceMap.clear()
      })

      return {
        ...state,
        account: action.payload,
      }
    }
    case 'REFRESH': {
      return {
        ...state,
      }
    }
  }
}

export const BalanceProviderContext = createContext<Provider>({} as Provider)

interface BalanceProviderContextProps {
  children: React.ReactNode
}

export function BalanceProvider({ children }: BalanceProviderContextProps) {
  const { address: account } = useAccount()
  const [state, dispatch] = useReducer(reducer, {
    account,
    chains: new Map(),
  })

  const config = useConfig()

  const incrementToken = useCallback((tokenId: TokenId | TokenId[]) => {
    dispatch({
      type: 'INCREMENT_TOKEN',
      payload: tokenId,
    })
  }, [])

  const decrementToken = useCallback((tokenId: TokenId | TokenId[]) => {
    dispatch({
      type: 'DECREMENT_TOKEN',
      payload: tokenId,
    })
  }, [])

  const refetchChain = useCallback(
  async (chainId: EvmChainId) => {
    console.log(`🔍 Starting balance fetch for chain ${chainId}`)
    
    const chain = getOrCreateChain(state, chainId)
    if (chain.isFetching || !state.account) {
      console.log(`❌ Skipping fetch: isFetching=${chain.isFetching}, account=${state.account}`)
      return
    }
    chain.isFetching = true

    // Remove the native address from the active tokens, it will be fetched separately
    const activeTokens = Array.from(chain.activeTokens.keys()).filter(
      (address) => address !== NativeAddress,
    )

    console.log(`📋 Active tokens to fetch:`, activeTokens)
    console.log(`👤 Account:`, state.account)

    const client = config.getClient({ chainId })
    console.log(`🌐 Client:`, client)

    const contracts = activeTokens.map((address) => ({
      address,
      functionName: 'balanceOf',
      args: [state.account],
      abi: erc20Abi_balanceOf as
        | typeof erc20Abi_balanceOf
        | typeof multicall3Abi_getEthBalance,
    }))

    // Multicall should be available everywhere
    // Worse case the native balance doesn't show up
    const multicallAddress = publicWagmiConfig.chains.find(
      (chain) => chain.id === chainId,
    )?.contracts.multicall3.address

    console.log(`📡 Multicall address:`, multicallAddress)

    if (multicallAddress) {
      contracts.push({
        address: multicallAddress,
        functionName: 'getEthBalance',
        args: [state.account],
        abi: multicall3Abi_getEthBalance,
      })
    }

    console.log(`📋 Contracts to call:`, contracts)

    try {
      const results = await multicall(client, {
        contracts,
        allowFailure: true,
      })

      console.log(`✅ Multicall results:`, results)

      results.forEach((result, index) => {
        // Should always be set, except for the last one, which we know is the native balance
        let address = activeTokens[index]
        if (!address) {
          address = NativeAddress
          console.log(`🔍 Processing ETH balance (native address)`)
        } else {
          console.log(`🔍 Processing token balance for:`, address)
        }

        if (result.status === 'failure') {
          console.error(
            `❌ Failed to fetch balance for ${address} on chain ${chainId}`,
            result.error
          )

          const existingBalance = chain.balanceMap.get(address)

          // Keep the stale balance if it exists
          // To prevent constant refetching
          if (!existingBalance || isBalanceStale(existingBalance)) {
            chain.balanceMap.set(address, {
              amount: BigInt(-1),
              lastUpdated: Date.now(),
            })
          }
          return
        }

        console.log(`✅ Successfully fetched balance for ${address}:`, result.result)

        chain.balanceMap.set(address, {
          amount: result.result,
          lastUpdated: Date.now(),
        })
      })
    } catch (error) {
      console.error(`💥 Multicall failed entirely:`, error)
    }

    chain.isFetching = false

    dispatch({
      type: 'REFRESH',
    })
  },
  [state, config],
)

  useEffect(() => {
    dispatch({
      type: 'UPDATE_ACCOUNT',
      payload: account,
    })
  }, [account])

  const updateAll = useCallback(() => {
    state.chains.forEach((_, chainId) => refetchChain(chainId))
  }, [state, refetchChain])

  useEffect(() => {
    document.addEventListener('focus', updateAll)

    return () => document.removeEventListener('focus', updateAll)
  }, [updateAll])

  const updateIfStaleOrMissing = useCallback(
    (chainId: EvmChainId) => {
      const chain = state.chains.get(chainId)

      if (!chain) return

      const activeTokens = Array.from(chain.activeTokens.keys())

      for (const token of activeTokens) {
        const balance = chain.balanceMap.get(token)

        if (!balance) {
          refetchChain(chainId)
          break
        }

        if (isBalanceStale(balance)) {
          refetchChain(chainId)
          break
        }
      }
    },
    [state, refetchChain],
  )

  const updateAllIfStaleOrMissing = useCallback(() => {
    state.chains.forEach((_, chainId) => updateIfStaleOrMissing(chainId))
  }, [state, updateIfStaleOrMissing])

  useEffect(() => {
    const interval = setInterval(updateAllIfStaleOrMissing, ms('1s'))
    updateAllIfStaleOrMissing()

    return () => clearInterval(interval)
  }, [updateAllIfStaleOrMissing])

  const mutate = useMemo<ProviderMutations>(() => {
    return {
      incrementToken,
      decrementToken,
      refetchChain,
    }
  }, [incrementToken, decrementToken, refetchChain])

  return (
    <BalanceProviderContext.Provider value={{ state, mutate }}>
      {children}
    </BalanceProviderContext.Provider>
  )
}

export function useBalanceProvider() {
  const context = useContext(BalanceProviderContext)

  if (!context) {
    throw new Error('useBalanceProvider must be used within a BalanceProvider')
  }

  return context
}
