'use client'

import ArrowsUpDownIcon from '@heroicons/react/24/solid/ArrowsUpDownIcon'
import {
  BrowserEvent,
  InterfaceElementName,
  SwapEventName,
  TraceEvent,
} from '@sushiswap/telemetry'

import { useDerivedStateSimpleSwap } from './derivedstate-simple-swap-provider'

export const SimpleSwapSwitchTokensButton = () => {
  const {
    mutate: { switchTokens },
  } = useDerivedStateSimpleSwap()

  return (
    <div className="left-0 right-0 mt-[-20px] mb-[-20px] flex items-center justify-center relative">
      {/* Left divider */}
      <div className="flex-1 h-px bg-gray-600"></div>
      
      <TraceEvent
        events={[BrowserEvent.onClick]}
        name={SwapEventName.SWAP_TOKENS_REVERSED}
        element={InterfaceElementName.SWAP_TOKENS_REVERSE_ARROW_BUTTON}
      >
        <button
          onClick={switchTokens}
          type="button"
          className="hover:shadow-sm transition-border z-10 group p-2 bg-[#00F5E0] transition-all rounded-full cursor-pointer mx-4"
        >
          <div className="transition-transform rotate-0 group-hover:rotate-180">
            <ArrowsUpDownIcon strokeWidth={3} className="w-5 h-5 text-black" />
          </div>
        </button>
      </TraceEvent>

      {/* Right divider */}
      <div className="flex-1 h-px bg-gray-600"></div>
    </div>
  )
}