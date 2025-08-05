import { get } from '@vercel/edge-config'

interface CrossChainSwapEdgeConfig {
  maintenance: boolean
}

const getCrossChainSwapEdgeConfig = async (): Promise<CrossChainSwapEdgeConfig | undefined> => {
  try {
    // Only use edge config in production/vercel environment
    if (process.env.EDGE_CONFIG) {
      return await get<CrossChainSwapEdgeConfig>('xswap')
    }
    
    // Return default config for local development
    return {
      maintenance: false
    }
  } catch (error) {
    console.warn('Edge config not available, using defaults:', error)
    return {
      maintenance: false
    }
  }
}

export { type CrossChainSwapEdgeConfig, getCrossChainSwapEdgeConfig }