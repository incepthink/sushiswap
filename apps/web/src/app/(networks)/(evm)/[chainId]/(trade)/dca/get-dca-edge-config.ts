import { get } from '@vercel/edge-config'

interface DCAEdgeConfig {
  maintenance: boolean
}

const getDCAEdgeConfig = async (): Promise<DCAEdgeConfig | undefined> => {
  try {
    // Only use edge config in production/vercel environment
    if (process.env.EDGE_CONFIG) {
      return await get<DCAEdgeConfig>('dca')
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

export { type DCAEdgeConfig, getDCAEdgeConfig }