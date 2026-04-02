/**
 * 图片懒加载组件
 * 使用 Intersection Observer 实现懒加载
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps {
  src: string
  alt: string
  placeholder?: string
  className?: string
  wrapperClassName?: string
  onLoad?: () => void
  onError?: () => void
  aspectRatio?: 'auto' | '1/1' | '4/3' | '16/9' | '3/2'
}

export default function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle"%3E加载中...%3C/text%3E%3C/svg%3E',
  className,
  wrapperClassName,
  onLoad,
  onError,
  aspectRatio = 'auto',
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 监听元素是否进入视口
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '100px', // 提前 100px 开始加载
        threshold: 0,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // 加载图片
  useEffect(() => {
    if (!isInView || !src) return

    const img = new Image()
    img.src = src

    img.onload = () => {
      setImageSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }

    img.onerror = () => {
      setIsError(true)
      onError?.()
    }
  }, [isInView, src, onLoad, onError])

  // 宽高比样式
  const aspectRatioStyles = {
    auto: {},
    '1/1': { aspectRatio: '1 / 1' },
    '4/3': { aspectRatio: '4 / 3' },
    '16/9': { aspectRatio: '16 / 9' },
    '3/2': { aspectRatio: '3 / 2' },
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        aspectRatio !== 'auto' && 'aspect-ratio',
        wrapperClassName
      )}
      style={aspectRatio !== 'auto' ? aspectRatioStyles[aspectRatio] : undefined}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
      />

      {/* 加载骨架屏 */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}
    </div>
  )
}
