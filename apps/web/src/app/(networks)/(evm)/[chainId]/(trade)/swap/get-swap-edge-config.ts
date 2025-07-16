// apps/web/src/app/(networks)/(evm)/[chainId]/(trade)/swap/get-swap-edge-config.ts

import { get } from '@vercel/edge-config'

// Import the existing SwapEdgeConfig type instead of creating a new one
// You may need to find where this type is defined and import it
// For now, let's use a generic type
type SwapEdgeConfig = Record<string, any>

const getSwapEdgeConfig = async (): Promise<SwapEdgeConfig> => {
  try {
    // Only try to get edge config if connection string is available
    if (process.env.EDGE_CONFIG) {
      return await get<SwapEdgeConfig>('swap') || {}
    } else {
      // Return empty config for local development
      console.warn('No EDGE_CONFIG connection string provided, using empty config')
      return {}
    }
  } catch (error) {
    console.warn('Failed to fetch edge config, using empty config:', error)
    return {}
  }
}

export { getSwapEdgeConfig }