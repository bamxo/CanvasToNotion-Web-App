// import request from 'supertest';
import {
  it,
  describe,
  expect,
  beforeAll,
  afterAll
} from 'vitest';
import { Browser, Page } from 'puppeteer';
import { BASE_URL, setupBrowser, createPage, isBrowserInitialized } from './utils/test-utils.js';

/**
 * Basic test to verify that the E2E test setup is working correctly.
 * This test will launch a browser, navigate to the app, and verify that
 * the page loads successfully.
 */
describe('E2E Test Setup Verification', () => {
  let localBrowser: Browser;
  let page: Page;

  beforeAll(async () => {
    // For this test we create our own browser instance
    // This allows this test to run independently of the global setup
    localBrowser = await setupBrowser();
  });

  afterAll(async () => {
    if (localBrowser) {
      await localBrowser.close();
    }
  });

  it('should correctly setup Puppeteer and load the application', async () => {
    // Create a new page
    page = await createPage(localBrowser, '/');
    
    // Verify that the page title contains expected text
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Verify the page loads without errors
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
    
    // Close the page when done
    await page.close();
  });
}); 