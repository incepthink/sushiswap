import CommonSwapLayout from 'src/lib/wagmi/components/CommonSwapLayout'
import { SwapModeButtons } from '../swap-mode-buttons'
import { CrossChainSwapHeader } from './cross-chain-swap-header'
import { CrossChainSwapMaintenanceMessage } from './cross-chain-swap-maintenance-message'
import { CrossChainSwapSettingsOverlay } from './cross-chain-swap-settings-overlay'
import { CrossChainSwapSwitchTokensButton } from './cross-chain-swap-switch-tokens-button'
import { CrossChainSwapTokenNotFoundDialog } from './cross-chain-swap-token-not-found-dialog'
import { CrossChainSwapToken0Input } from './cross-chain-swap-token0-input'
import { CrossChainSwapToken1Input } from './cross-chain-swap-token1-input'
import { CrossChainSwapTradeButton } from './cross-chain-swap-trade-button'
import { CrossChainSwapTradeStats } from './cross-chain-swap-trade-stats'

export const CrossChainSwapWidget = () => {
  return (
    // <CommonSwapLayout>
    <div className="flex flex-col gap-4 p-4 md:p-6 dark:bg-transparent rounded-3xl backdrop-blur-2xl">
      <div className=" w-full">
                
                <SwapModeButtons />
                
              </div>
              <div className='flex justify-between items-center pl-0.5'>
      <p className='text-xl'>Cross-Chain Swap</p>
      <CrossChainSwapSettingsOverlay />
              </div>
      <CrossChainSwapMaintenanceMessage />
      <CrossChainSwapToken0Input />
      <CrossChainSwapSwitchTokensButton />
      <div className="flex flex-col gap-4">
        <CrossChainSwapToken1Input />
        <CrossChainSwapTradeButton />
        <CrossChainSwapTradeStats />
      </div>
      <CrossChainSwapTokenNotFoundDialog />
    </div>
    // </CommonSwapLayout>
  )
}
