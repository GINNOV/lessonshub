'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import TimezoneSync from './TimezoneSync'
import { cn } from '@/lib/utils'

export default function PageContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'
  const isFullBleedGame = pathname?.startsWith('/games')
  const isMarketplace = pathname === '/marketplace'

  return (
    <div
      className={cn(
        isFullBleedGame || isMarketplace
          ? 'min-h-[calc(100svh-4rem)] w-screen max-w-none px-0 py-0'
          : isLanding
            ? 'min-h-full'
            : 'container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 text-slate-100'
      )}
    >
      <TimezoneSync />
      {children}
    </div>
  )
}
