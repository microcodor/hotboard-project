/**
 * Next.js 配置文件
 * 包含性能优化、SEO、图片配置等
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 图片优化
  images: {
    remotePatterns: [
      { hostname: 'pica.zhimg.com' },
      { hostname: 'pic3.zhimg.com' },
      { hostname: 'pic1.zhimg.com' },
      { hostname: 'pic2.zhimg.com' },
      { hostname: 'file.ibmwclub.com' },
      { hostname: 'ww*.sinaimg.cn' },
      { hostname: 'p*.pstatp.com' },
      { hostname: 'cdn.jsdelivr.net' },
      { hostname: '*.cloudfront.net' },
      { hostname: 'img*.douban.com' },
      { hostname: 'i*.hdslb.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 1 天缓存
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 国际化
  i18n: {
    locales: ['zh-CN', 'en'],
    defaultLocale: 'zh-CN',
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_APP_NAME: 'HotBoard',
    NEXT_PUBLIC_APP_DESCRIPTION: '全网热榜聚合平台',
    NEXT_PUBLIC_APP_URL: 'https://hotboard.example.com',
  },

  // 重定向
  async redirects() {
    return [
      {
        source: '/rank',
        destination: '/hot',
        permanent: true,
      },
      {
        source: '/ranking',
        destination: '/hot',
        permanent: true,
      },
    ]
  },

  // 重写
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/tophub/:path*',
          destination: 'https://api.tophubdata.com/:path*',
        },
      ],
    }
  },

  // 响应头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // 压缩
  compress: true,

  // 生成 ETag
  generateEtags: true,

  // 依赖优化
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // webpack 配置
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev) {
      // 代码分割优化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // 分离 vendor
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // 分离 react
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|swr)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
            },
            // 分离 common
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }

    return config
  },
}

module.exports = nextConfig
