/**
 * 响应式图片组件（支持懒加载）
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down'
  fallback?: string
  lazy?: boolean
}

export default function ResponsiveImage({
  src,
  alt,
  width,
  height,
  className,
  objectFit = 'cover',
  fallback = 'https://via.placeholder.com/400x300?text=Image+Not+Found',
  lazy = true,
}: ResponsiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(lazy ? '' : src)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // 懒加载实现
  useEffect(() => {
    if (!lazy) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [src, lazy])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setError(true)
    setImageSrc(fallback)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        className
      )}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      <img
        ref={imgRef}
        src={imageSrc || fallback}
        alt={alt}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          `object-${objectFit}`,
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? 'lazy' : 'eager'}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  )
}
