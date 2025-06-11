import { Browser, Page, launch } from 'puppeteer';

/**
 * Base URL for the application
 */
export const BASE_URL = 'http://localhost:5173';

/**
 * Test user credentials for authentication tests
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!',
  invalidPassword: 'WrongPassword123!'
};

/**
 * Helper function to check if browser is initialized
 */
export function isBrowserInitialized(): boolean {
  return !!global.browser;
}

/**
 * Sets up a browser instance for testing
 */
export async function setupBrowser(): Promise<Browser> {
  return await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
}

/**
 * Creates a new page in the browser and navigates to the base URL
 */
export async function createPage(browser: Browser, path: string = '/'): Promise<Page> {
  const page = await browser.newPage();
  
  // Suppress console logs from the page
  page.on('console', () => {
    // Silence console logs
  });
  
  // Increase the timeout for navigation
  page.setDefaultNavigationTimeout(30000);
  
  // Navigate to the specified path
  await page.goto(`${BASE_URL}${path}`);
  
  return page;
}

/**
 * Logs in a user using the provided credentials
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  
  // Wait for the login form to be visible
  await page.waitForSelector('form');
  
  // Fill in the login form
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

/**
 * Utility function to delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility function to check if an element exists on the page
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    return document.querySelector(sel) !== null;
  }, selector);
} 