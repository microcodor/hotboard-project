/**
 * HotBoard Logo 组件
 */

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HotBoardLogoProps {
  href?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function HotBoardLogo({ href = '/', className, size = 'md' }: HotBoardLogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  const iconSizes = {
    sm: 'h-6 w-6 text-sm',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const logo = (
    <div className="flex items-center gap-2">
      {/* Logo 图标 */}
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white font-bold shadow-lg',
          iconSizes[size]
        )}
      >
        🔥
      </div>

      {/* Logo 文字 */}
      <span className={cn('font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent', sizeClasses[size], className)}>
        HotBoard
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logo}
      </Link>
    )
  }

  return logo
}

export default HotBoardLogo
