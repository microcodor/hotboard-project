'use client';

import { TrendingUp, Zap, Target } from 'lucide-react';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function HeroSection({
  title = '全网热榜，一目了然',
  subtitle = '聚合各大平台实时热点，一站式追踪全网热门资讯',
  className,
}: HeroSectionProps) {
  return (
    <section className={cn('relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 md:py-24', className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)]" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          {/* Main Title */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/hot"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              查看热榜
            </a>
            <a
              href="/categories"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              浏览分类
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <Feature
            icon={<TrendingUp className="h-6 w-6" />}
            title="实时热榜"
            description="聚合全网50+平台实时热榜，分钟级更新"
          />
          <Feature
            icon={<Zap className="h-6 w-6" />}
            title="快速访问"
            description="一键直达热点原文，高效追踪资讯"
          />
          <Feature
            icon={<Target className="h-6 w-6" />}
            title="智能分类"
            description="科技、娱乐、财经等多维度分类"
          />
        </div>
      </div>
    </section>
  );
}

// Feature component
function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Import cn helper
import { cn } from '@/lib/utils';
