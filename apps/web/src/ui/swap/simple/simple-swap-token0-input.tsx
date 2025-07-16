'use client'

import { Web3Input } from 'src/lib/wagmi/components/web3-input'
import { isWNativeSupported } from 'sushi/config'
import { useDerivedStateSimpleSwap } from './derivedstate-simple-swap-provider'

export const SimpleSwapToken0Input = () => {
  const {
    state: { swapAmountString, chainId, token0 },
    mutate: { setSwapAmount, setToken0 },
    isToken0Loading: isLoading,
  } = useDerivedStateSimpleSwap()

  console.log("TOKEN)::", token0);

  return (
    <Web3Input.Currency
      id="swap-from"
      type="INPUT"
      className="border-[2px] border-[#00FFE9] p-3 rounded-xl"
      chainId={chainId}
      onSelect={setToken0}
      value={swapAmountString}
      onChange={setSwapAmount}
      currency={token0}
      loading={isLoading}
      currencyLoading={isLoading}
      allowNative={isWNativeSupported(chainId)}
      label="Sell"
    />
  )
}
