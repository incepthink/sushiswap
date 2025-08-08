'use client'

import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  BrowserEvent,
  InterfaceElementName,
  InterfaceEventName,
  TraceEvent,
} from '@sushiswap/telemetry'
import { Button, type ButtonProps } from '@sushiswap/ui'
import React, { type FC, useCallback } from 'react'
import { useConnect } from '../hooks/wallet/useConnect'
import { useChainId, useSwitchChain } from 'wagmi'

export const ConnectButton: FC<ButtonProps> = ({
  children: _children,
  selectedNetowrk,
  ...props
}) => {
  const { pending, connect, connectors } = useConnect()
  const { openConnectModal } = useConnectModal()
  const {  switchChain } = useSwitchChain()

  const chainId = useChainId()

  const onConnect = useCallback(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV === 'test') {
      connect({ connector: connectors[0] })
    } else {
      console.log("SELECTD NETWORK", selectedNetowrk);
      
      openConnectModal?.()
    }
  }, [openConnectModal, connect, connectors])

  // Pending confirmation state
  // Awaiting wallet confirmation
  if (pending) {
    return (
      <Button loading {...props}>
        Authorize Wallet
      </Button>
    )
  }

  return (
    <TraceEvent
      events={[BrowserEvent.onClick]}
      name={InterfaceEventName.CONNECT_WALLET_BUTTON_CLICKED}
      element={InterfaceElementName.CONNECT_WALLET_BUTTON}
    >
      <Button
        {...props}
        onClick={onConnect}
        onKeyDown={onConnect}
        testId="connect"
      >
        <span className="hidden sm:block">Connect Wallet</span>
        <span className="block sm:hidden">Connect</span>
      </Button>
    </TraceEvent>
  )
}
