/**
 * HotBoard 数据抓取引擎
 * 支持多种抓取方式：API、HTML、Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface CrawlResult {
  platform: string;
  success: boolean;
  items: CrawledItem[];
  error?: string;
  crawledAt: Date;
}

export interface CrawledItem {
  title: string;
  url: string;
  hot?: number;
  hotText?: string;
  rank: number;
  thumbnail?: string;
  description?: string;
  extra?: Record<string, any>;
}

export interface PlatformRule {
  id: string;
  name: string;
  url: string;
  type: 'api' | 'html' | 'puppeteer';
  enabled: boolean;
  cron: string;
  parser: string; // 函数名称
  headers?: Record<string, string>;
  selector?: string;
  waitFor?: string;
}

class CrawlerEngine {
  private browser: Browser | null = null;
  private initialized = false;

  /**
   * 初始化浏览器
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });
      this.initialized = true;
      console.log('[Crawler] Browser initialized');
    } catch (error) {
      console.error('[Crawler] Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.initialized = false;
      console.log('[Crawler] Browser closed');
    }
  }

  /**
   * 使用 Puppeteer 抓取页面
   */
  async crawlWithPuppeteer(
    url: string,
    options: {
      waitFor?: string;
      selector?: string;
      evaluate?: string;
      headers?: Record<string, string>;
    } = {}
  ): Promise<any> {
    if (!this.browser) await this.init();

    const page = await this.browser!.newPage();

    try {
      // 设置 User-Agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // 设置额外的 headers
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // 访问页面
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 等待特定元素
      if (options.waitFor) {
        await page.waitForSelector(options.waitFor, { timeout: 10000 });
      }

      // 执行评估脚本
      let result: any;
      if (options.evaluate) {
        result = await page.evaluate(options.evaluate);
      } else if (options.selector) {
        result = await page.$$eval(options.selector, (elements) =>
          elements.map((el) => ({
            html: el.innerHTML,
            text: el.textContent,
            href: (el as HTMLAnchorElement).href,
          }))
        );
      }

      return result;
    } finally {
      await page.close();
    }
  }

  /**
   * 抓取 API 数据
   */
  async crawlApi(
    url: string,
    options: {
      headers?: Record<string, string>;
      method?: 'GET' | 'POST';
      body?: any;
    } = {}
  ): Promise<any> {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[Crawler] API crawl failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * 抓取 HTML 页面
   */
  async crawlHtml(
    url: string,
    options: {
      headers?: Record<string, string>;
    } = {}
  ): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`[Crawler] HTML crawl failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * 执行抓取任务
   */
  async execute(rule: PlatformRule): Promise<CrawlResult> {
    const startTime = Date.now();
    console.log(`[Crawler] Starting crawl: ${rule.name}`);

    try {
      let data: any;

      switch (rule.type) {
        case 'api':
          data = await this.crawlApi(rule.url, { headers: rule.headers });
          break;
        case 'html':
          data = await this.crawlHtml(rule.url, { headers: rule.headers });
          break;
        case 'puppeteer':
          data = await this.crawlWithPuppeteer(rule.url, {
            waitFor: rule.waitFor,
            selector: rule.selector,
            headers: rule.headers,
          });
          break;
        default:
          throw new Error(`Unknown crawl type: ${rule.type}`);
      }

      // 解析数据（这里需要根据具体平台实现）
      const items: CrawledItem[] = this.parseData(rule, data);

      console.log(`[Crawler] Completed: ${rule.name}, ${items.length} items, ${Date.now() - startTime}ms`);

      return {
        platform: rule.id,
        success: true,
        items,
        crawledAt: new Date(),
      };
    } catch (error) {
      console.error(`[Crawler] Failed: ${rule.name}`, error);
      return {
        platform: rule.id,
        success: false,
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        crawledAt: new Date(),
      };
    }
  }

  /**
   * 解析数据（根据平台规则）
   */
  private parseData(rule: PlatformRule, data: any): CrawledItem[] {
    // 这里是通用解析器，具体平台的解析在各自的规则文件中实现
    // 默认返回空数组，需要子类或策略模式来扩展
    console.warn(`[Crawler] No parser implemented for: ${rule.id}`);
    return [];
  }
}

// 导出单例
export const crawlerEngine = new CrawlerEngine();
export default CrawlerEngine;
