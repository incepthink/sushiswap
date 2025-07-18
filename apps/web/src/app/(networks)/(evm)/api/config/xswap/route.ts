export const dynamic = 'force-dynamic'

import { get } from '@vercel/edge-config'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  maintenance: z.boolean(),
})

// export const runtime = 'edge'

export const revalidate = 60

export async function GET() {
  const data = await get('xswap')
  return NextResponse.json(schema.safeParse(data))
}
