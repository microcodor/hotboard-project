/**
 * E2E 测试辅助函数
 * 
 * 提供测试通用的辅助方法
 */

import { Page, expect } from '@playwright/test';

// 测试账号配置
export const TEST_USERS = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    username: 'testuser',
  },
  newUser: {
    email: `newuser${Date.now()}@example.com`,
    password: 'NewPassword123!',
    username: `newuser${Date.now()}`,
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!',
  },
};

// 页面 URL
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  search: '/search',
  hot: '/hot',
  calendar: '/calendar',
  user: '/user',
  userFavorites: '/user/favorites',
  userHistory: '/user/history',
  userSettings: '/user/settings',
  nodeDetail: (hashid: string) => `/n/${hashid}`,
};

// 等待页面加载完成
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

// 登录辅助函数
export async function login(page: Page, email: string, password: string) {
  await page.goto(ROUTES.login);
  await waitForPageLoad(page);
  
  // 填写登录表单
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  
  // 等待跳转到首页
  await page.waitForURL('**/', { timeout: 10000 });
  await waitForPageLoad(page);
}

// 注册辅助函数
export async function register(page: Page, email: string, password: string, username?: string) {
  await page.goto(ROUTES.register);
  await waitForPageLoad(page);
  
  // 填写注册表单
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  if (username) {
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await page.fill('input[name="username"]', username);
    }
  }
  
  // 点击注册按钮
  await page.click('button[type="submit"]');
  
  // 等待跳转或成功提示
  try {
    await page.waitForURL('**/', { timeout: 10000 });
  } catch {
    // 可能需要邮箱验证，检查成功提示
    const successMessage = await page.$('[data-testid="success-message"]');
    if (successMessage) {
      await expect(successMessage).toBeVisible();
    }
  }
}

// 登出辅助函数
export async function logout(page: Page) {
  // 点击用户菜单
  await page.click('[data-testid="user-menu"]');
  
  // 点击登出按钮
  await page.click('[data-testid="logout-button"]');
  
  // 等待跳转到首页
  await page.waitForURL('**/', { timeout: 10000 });
}

// 添加收藏辅助函数
export async function addFavorite(page: Page, hashid: string) {
  // 访问榜单详情页
  await page.goto(ROUTES.nodeDetail(hashid));
  await waitForPageLoad(page);
  
  // 点击收藏按钮
  const favoriteButton = await page.$('[data-testid="favorite-button"]');
  if (favoriteButton) {
    await favoriteButton.click();
  }
}

// 移除收藏辅助函数
export async function removeFavorite(page: Page, hashid: string) {
  // 访问收藏列表
  await page.goto(ROUTES.userFavorites);
  await waitForPageLoad(page);
  
  // 找到对应收藏项并删除
  const favoriteItem = await page.$(`[data-testid="favorite-${hashid}"]`);
  if (favoriteItem) {
    const removeButton = await favoriteItem.$('[data-testid="remove-favorite"]');
    if (removeButton) {
      await removeButton.click();
    }
  }
}

// 搜索辅助函数
export async function search(page: Page, query: string) {
  await page.goto(ROUTES.search);
  await waitForPageLoad(page);
  
  // 填写搜索框
  await page.fill('input[name="search"]', query);
  
  // 点击搜索按钮或按 Enter
  await page.press('input[name="search"]', 'Enter');
  
  // 等待搜索结果
  await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
}

// 检查元素是否可见
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  const element = await page.$(selector);
  if (!element) return false;
  return await element.isVisible();
}

// 获取元素文本
export async function getElementText(page: Page, selector: string): Promise<string> {
  const element = await page.$(selector);
  if (!element) return '';
  return await element.textContent() || '';
}

// 截图辅助函数
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

// Mock API 响应
export async function mockApiRoute(page: Page, path: string, response: any) {
  await page.route(`**/api${path}`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

// 等待 Toast 消息
export async function waitForToast(page: Page, expectedText?: string) {
  const toast = await page.waitForSelector('[data-testid="toast"]', { timeout: 5000 });
  
  if (expectedText) {
    const text = await toast.textContent();
    expect(text).toContain(expectedText);
  }
  
  return toast;
}

// 清除本地存储
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// 设置视口大小
export async function setViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
}

// 模拟移动端设备
export async function emulateMobile(page: Page) {
  await setViewport(page, 375, 667);
}
