/**
 * robots.txt
 */

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/user/settings/',
          '/user/password/',
        ],
      },
    ],
    sitemap: 'https://hotboard.example.com/sitemap.xml',
  }
}
