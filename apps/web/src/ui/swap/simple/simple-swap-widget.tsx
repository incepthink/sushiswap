import { SwapModeButtons } from '../swap-mode-buttons'
import { SimpleSwapBanner } from './simple-swap-banner'
import { SimpleSwapSettingsOverlay } from './simple-swap-settings-overlay'
import { SimpleSwapSwitchTokensButton } from './simple-swap-switch-tokens-button'
import { SimpleSwapTokenNotFoundDialog } from './simple-swap-token-not-found-dialog'
import { SimpleSwapToken0Input } from './simple-swap-token0-input'
import { SimpleSwapToken1Input } from './simple-swap-token1-input'
import { SimpleSwapTradeButton } from './simple-swap-trade-button'
import { SimpleSwapTradeStats } from './simple-swap-trade-stats'
import { SwapMaintenanceMessage } from './swap-maintenance-message'

export const SimpleSwapWidget = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-[17px] p-1 pt-4 pb-4 dark:bg-transparent rounded-3xl">
        <div className=" w-full">
          
          <SwapModeButtons />
          
        </div>
        <div className='flex justify-between items-center pl-0.5'>
<p className='text-xl'>Swap</p>
<SimpleSwapSettingsOverlay />
        </div>
        <SwapMaintenanceMessage />
        <div className="flex flex-col gap-10">
          <SimpleSwapToken0Input />
          <SimpleSwapSwitchTokensButton />
          <SimpleSwapToken1Input />
        </div>
        <SimpleSwapTradeButton />
        <SimpleSwapTradeStats />
      </div>
      <SimpleSwapBanner />
      <SimpleSwapTokenNotFoundDialog />
    </div>
  )
}