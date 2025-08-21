"use client"

import React, { useState } from 'react'
import { useDerivedStateSimpleSwap } from 'src/ui/swap/simple/derivedstate-simple-swap-provider'
import { Web3Input } from '../../web3-input'
import type { Type } from 'sushi/currency'

/**
 * TokenSelect Component
 * 
 * A token selection input that opens a popup modal for choosing tokens.
 * Uses Web3Input.Currency for full functionality.
 */
const TokenSelect = () => {
  const {
    state: { chainId, token0 },
    mutate: { setToken0 },
    isToken1Loading: tokenLoading,
  } = useDerivedStateSimpleSwap()

  // Local state for the input value (amount)
  const [value, setValue] = useState('')

  const handleTokenSelect = (currency: Type) => {
    console.log('Token selected:', currency.symbol)
    setToken0(currency);
  };

  const handleValueChange = (val: string) => {
    setValue(val)
  };

  return (
    <Web3Input.Currency
      id="token-select"
      type="INPUT"
      value={value}                    // Required: input amount value
      onChange={handleValueChange}     // Required: handle input changes
      onSelect={setToken0}             // Handle token selection
      currency={token0}                // Current selected token
      chainId={chainId}                // Current chain
      currencyLoading={tokenLoading}   // Loading state
      className=""
      label="Select Token"             // Optional label
      tokenSelectorOnly={true}         // ← ADD THIS LINE
      topSelect={true}
    />
  );
};

export default TokenSelect;