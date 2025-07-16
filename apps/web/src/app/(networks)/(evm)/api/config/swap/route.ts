import { get } from '@vercel/edge-config'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  maintenance: z.boolean(),
})

export const runtime = 'edge'

export const revalidate = 60

export async function GET() {
  try {
    // Only try to get edge config if connection string is available
    if (process.env.EDGE_CONFIG) {
      const data = await get('swap')
      return NextResponse.json(schema.safeParse(data))
    } else {
      // Return default config for local development
      console.warn('No EDGE_CONFIG connection string provided, using default config in API route')
      const defaultData = { maintenance: false }
      return NextResponse.json(schema.safeParse(defaultData))
    }
  } catch (error) {
    console.warn('Failed to fetch edge config in API route, using default config:', error)
    const defaultData = { maintenance: false }
    return NextResponse.json(schema.safeParse(defaultData))
  }
}