import Link from 'next/link';
import { Github, Twitter } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: '产品',
      links: [
        { label: '热门榜单', href: '/hot' },
        { label: '分类浏览', href: '/categories' },
        { label: 'API 文档', href: '/api-docs' },
      ],
    },
    {
      title: '资源',
      links: [
        { label: '帮助中心', href: '/help' },
        { label: '隐私政策', href: '/privacy' },
        { label: '服务条款', href: '/terms' },
      ],
    },
    {
      title: '关于',
      links: [
        { label: '关于我们', href: '/about' },
        { label: '联系方式', href: '/contact' },
        { label: '更新日志', href: '/changelog' },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                H
              </div>
              <span className="text-xl font-bold">HotBoard</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              全网热榜聚合平台，一站式追踪所有热点资讯。
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {currentYear} HotBoard. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
