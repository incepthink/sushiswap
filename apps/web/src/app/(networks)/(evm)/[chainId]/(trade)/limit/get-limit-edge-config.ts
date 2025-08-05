// In your edge-config file, replace the content with:
import { get } from '@vercel/edge-config'

interface LimitEdgeConfig {
  maintenance: boolean
}

const getLimitEdgeConfig = async (): Promise<LimitEdgeConfig | undefined> => {
  try {
    // Only use edge config in production/vercel environment
    if (process.env.EDGE_CONFIG) {
      return await get<LimitEdgeConfig>('limit')
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

export { type LimitEdgeConfig, getLimitEdgeConfig }