'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sushiswap/ui'
import { Currency } from '@sushiswap/ui'
import React, { type FC, type ReactNode, useCallback, useState } from 'react'
import type { EvmChainId } from 'sushi/chain'
import type { Type } from 'sushi/currency'
import { useFixedTokens } from './common/use-fixed-tokens'

interface SimpleTokenSelectorProps {
  selected: Type | undefined
  chainId: EvmChainId
  onSelect(currency: Type): void
  children: ReactNode
  includeNative?: boolean
}

export const SimpleTokenSelector: FC<SimpleTokenSelectorProps> = ({
  selected,
  chainId,
  onSelect,
  children,
  includeNative = true,
}) => {
  const [open, setOpen] = useState(false)
  
  const { tokens, isLoading, isError } = useFixedTokens({
    chainId,
    includeNative,
  })

  const handleSelect = useCallback(
    (currency: Type) => {
      console.log('SimpleTokenSelector: Selecting token', currency.symbol) // Debug log
      onSelect(currency)
      setOpen(false)
    },
    [onSelect],
  )

  // Debug logs
  console.log('SimpleTokenSelector: tokens', tokens)
  console.log('SimpleTokenSelector: chainId', chainId)
  console.log('SimpleTokenSelector: open', open)

  // Check if selected token exists in our fixed tokens list
  const isSelectedTokenAvailable = selected ? 
    tokens.some(token => token.id === selected.id) : 
    true

  if (isError) {
    console.error('Error loading tokens')
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="!w-96 !max-w-96 !p-0">
        <div className="p-6">
          <DialogHeader className="!text-left mb-4">
            <DialogTitle>Select a token</DialogTitle>
          </DialogHeader>
          
          {!isSelectedTokenAvailable && selected && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                Currently selected token ({selected.symbol}) is not available in the token list.
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-4">Loading tokens...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tokens.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No tokens available</div>
              ) : (
                tokens.map((token: Type) => (
                  <button
                    key={token.id}
                    onClick={() => handleSelect(token)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      selected?.id === token.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="w-8 h-8">
                      <Currency.Icon
                        currency={token}
                        width={32}
                        height={32}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}