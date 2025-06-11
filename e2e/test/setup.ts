import { Browser } from 'puppeteer';
import { afterAll, beforeAll } from 'vitest';
import { setupBrowser } from './utils/test-utils.js';

// Global browser instance to be shared across tests
let browser: Browser;

beforeAll(async () => {
  // Silence error outputs
  const originalConsoleError = console.error;
  console.error = () => {};
  
  // Setup browser instance for all tests
  browser = await setupBrowser();
  
  // Make the browser instance globally available
  global.browser = browser;
  
  // Restore console.error for other uses
  console.error = originalConsoleError;
});

afterAll(async () => {
  // Close browser when tests are done
  if (browser) {
    await browser.close();
  }
});

// Add TypeScript declaration for global browser
declare global {
  // eslint-disable-next-line no-var
  var browser: Browser;
} 