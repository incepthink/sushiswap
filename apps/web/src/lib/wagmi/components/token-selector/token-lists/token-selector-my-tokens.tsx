import type { TokenListChainId } from '@sushiswap/graph-client/data-api'
import { List } from '@sushiswap/ui'
import type { Type } from 'sushi/currency'
import type { EvmChainId } from 'sushi/chain'
import { useAccount } from 'wagmi'
import { usePrices } from '~evm/_common/ui/price-provider/price-provider/use-prices'
// Import your new hook instead of useMyTokens
import { useFixedTokens } from './common/use-fixed-tokens'
import {
  TokenSelectorCurrencyList,
  TokenSelectorCurrencyListLoading,
} from './common/token-selector-currency-list'

interface TokenSelectorMyTokens {
  chainId: TokenListChainId
  onSelect(currency: Type): void
  onShowInfo(currency: Type | false): void
  selected: Type | undefined
  includeNative?: boolean
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="text-sm">Featured Tokens</div> {/* Changed from "My Tokens" */}
      <List.Control className="flex flex-1">
        <div className="flex-1 block">{children}</div>
      </List.Control>
    </div>
  )
}

export function TokenSelectorMyTokens({
  chainId,
  onSelect,
  onShowInfo,
  selected,
  includeNative,
}: TokenSelectorMyTokens) {
  const { address } = useAccount()

  // Use the fixed tokens hook instead of useMyTokens
  const { tokens, balanceMap, isError, isLoading } = useFixedTokens({
    chainId: chainId as EvmChainId,
    includeNative,
  })

  console.log("FIXED TOKENS::", tokens);

  const { data: pricesMap } = usePrices({
    chainId,
  })

  if (isLoading)
    return (
      <Shell>
        <TokenSelectorCurrencyListLoading count={10} />
      </Shell>
    )

  if (isError)
    return (
      <Shell>
        <div className="flex w-full justify-center py-3">
          An error has occurred.
        </div>
      </Shell>
    )

  if (!tokens.length)
    return (
      <Shell>
        <div className="flex w-full justify-center py-3">
          No tokens available for this chain.
        </div>
      </Shell>
    )

  return (
    <Shell>
      <TokenSelectorCurrencyList
        id="fixed-tokens"
        selected={selected}
        onSelect={onSelect}
        onShowInfo={onShowInfo}
        currencies={tokens} // Pass the fixed tokens array directly
        chainId={chainId}
        balancesMap={balanceMap} // Empty map since we're not showing balances
        pricesMap={pricesMap}
        isBalanceLoading={false} // Set to false since we're not loading balances
      />
    </Shell>
  )
}