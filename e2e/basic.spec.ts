import { test, expect } from '@playwright/test';
import { waitForPageLoad, mockApiRoute, takeScreenshot } from './test-helpers';

/**
 * HotBoard E2E 基础测试 - 首页加载与核心功能
 */
test.describe('首页加载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('页面标题正确显示', async ({ page }) => {
    await expect(page).toHaveTitle(/HotBoard/);
  });

  test('Hero 区域显示应用名称和描述', async ({ page }) => {
    // 验证 Hero 区域
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    // 验证应用名称
    const title = page.locator('h1');
    await expect(title).toContainText('HotBoard');

    // 验证描述文字
    const description = page.locator('section').first().locator('p');
    await expect(description).toContainText('全网热榜聚合平台');
  });

  test('分类筛选栏正常渲染', async ({ page }) => {
    const categorySection = page.locator('section').nth(1);

    // 默认显示"全部"按钮
    const allButton = categorySection.getByRole('button', { name: '全部' });
    await expect(allButton).toBeVisible();
    await expect(allButton).toHaveClass(/bg-blue-600/); // 默认选中状态

    // 检查分类加载状态完成（"加载中..."消失）
    await expect(page.locator('text=加载中...')).not.toBeVisible({ timeout: 15000 });
  });

  test('热门榜单标题可见', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /热门榜单/ });
    await expect(heading).toBeVisible();
  });

  test('页脚正确显示版权信息', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toContainText('HotBoard');
    await expect(footer).toContainText(new Date().getFullYear().toString());
  });
});

test.describe('首页交互', () => {
  test('点击分类按钮切换筛选状态', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // 等待分类加载完成
    await expect(page.locator('text=加载中...')).not.toBeVisible({ timeout: 15000 });

    // 获取所有分类按钮
    const categoryButtons = page.locator('section').nth(1).getByRole('button');
    const count = await categoryButtons.count();

    if (count > 1) {
      // 点击第二个分类按钮
      await categoryButtons.nth(1).click();

      // 验证标题变为"分类榜单"
      const heading = page.getByRole('heading', { name: /分类榜单/ });
      await expect(heading).toBeVisible();

      // 验证"全部"按钮不再是选中状态
      const allButton = page.getByRole('button', { name: '全部' });
      await expect(allButton).not.toHaveClass(/bg-blue-600/);

      // 验证被点击的按钮是选中状态
      await expect(categoryButtons.nth(1)).toHaveClass(/bg-blue-600/);
    }
  });

  test('点击"全部"按钮恢复默认视图', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    // 等待分类加载完成
    await expect(page.locator('text=加载中...')).not.toBeVisible({ timeout: 15000 });

    const categoryButtons = page.locator('section').nth(1).getByRole('button');
    const count = await categoryButtons.count();

    if (count > 1) {
      // 先点击其他分类
      await categoryButtons.nth(1).click();
      await expect(page.getByRole('heading', { name: /分类榜单/ })).toBeVisible();

      // 再点击"全部"
      await page.getByRole('button', { name: '全部' }).click();
      await expect(page.getByRole('heading', { name: /热门榜单/ })).toBeVisible();
    }
  });
});

test.describe('首页 - API 异常处理', () => {
  test('分类 API 失败时显示错误提示', async ({ page }) => {
    // Mock 分类 API 返回错误
    await page.route('**/api/categories', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');
    await waitForPageLoad(page);

    // 应该看到加载失败的错误提示
    const errorIndicator = page.locator('text=加载失败');
    await expect(errorIndicator).toBeVisible({ timeout: 15000 });
  });

  test('节点 API 失败时显示重试按钮', async ({ page }) => {
    // Mock 节点 API 返回错误
    await page.route('**/api/nodes**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');
    await waitForPageLoad(page);

    // 等待错误状态出现
    await expect(page.locator('text=加载失败')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '重试' })).toBeVisible();
  });
});

test.describe('响应式布局', () => {
  test('移动端视口下页面正常显示', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/');
    await waitForPageLoad(page);

    // 验证页面核心元素可见
    await expect(page.locator('h1')).toContainText('HotBoard');
    await expect(page.locator('footer')).toBeVisible();

    await context.close();
  });
});
