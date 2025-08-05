'use client'

import { Web3Input } from 'src/lib/wagmi/components/web3-input'
import { isWNativeSupported } from 'sushi/config'
import { useDerivedStateTwap, useTwapTrade } from './derivedstate-twap-provider'

export const TwapToken1Input = () => {
  const {
    state: { chainId, token1, amountOut },
    mutate: { setToken1 },
    isToken1Loading: isLoading,
  } = useDerivedStateTwap()

  return (
    <Web3Input.Currency
      id="swap-to"
      type="OUTPUT"
      disabled
      className="border border-[#00FFE9] p-3 rounded-xl"
      value={amountOut?.toSignificant() ?? ''}
      chainId={chainId}
      onSelect={setToken1}
      currency={token1}
      disableMaxButton
      currencyLoading={isLoading}
      allowNative={isWNativeSupported(chainId)}
      label="You're buying"
    />
  )
}
