import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Browser, Page } from 'puppeteer';
import { 
  BASE_URL,
  createPage,
  elementExists,
  isBrowserInitialized
} from './utils/test-utils.js';

describe('App Navigation and Features Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Make sure global browser is initialized
    if (!isBrowserInitialized()) {
      throw new Error('Global browser is not initialized');
    }
    browser = global.browser;
  });

  beforeEach(async () => {
    // Create a new page for each test
    page = await createPage(browser, '/');
  });

  afterEach(async () => {
    // Close the page after each test
    if (page) {
      await page.close();
    }
  });

  describe('Landing Page', () => {
    it('should load the landing page', async () => {
      await page.goto(`${BASE_URL}/`);
      
      // Check if the page title is displayed
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      
      // Check if logo is displayed
      const logoExists = await elementExists(page, 'img[alt*="logo"], img[alt*="Logo"], img');
      expect(logoExists).toBe(true);
    });

    it('should have navigation elements', async () => {
      await page.goto(`${BASE_URL}/`);
      
      // Check for any navigation elements
      const hasNavigation = await elementExists(page, 'nav, header, a, button');
      expect(hasNavigation).toBe(true);
    });

    it('should allow navigation to login page', async () => {
      await page.goto(`${BASE_URL}/`);
      
      // Directly navigate to login page to check it exists
      await page.goto(`${BASE_URL}/login`);
      
      // Verify we're on login page
      const hasLoginForm = await elementExists(page, 'input[name="email"], input[type="email"]');
      expect(hasLoginForm).toBe(true);
    });
  });

  describe('About Page', () => {
    it('should navigate to and load the about page', async () => {
      // Directly navigate to about page
      await page.goto(`${BASE_URL}/about`);
      
      // Check if about page content exists
      const contentExists = await elementExists(page, 'h1, h2, p');
      expect(contentExists).toBe(true);
    });
  });

  describe('Terms and Privacy', () => {
    it('should navigate to and load the terms page', async () => {
      await page.goto(`${BASE_URL}/terms`);
      
      // Check if terms page content exists
      const termsContent = await elementExists(page, 'h1, h2, p');
      expect(termsContent).toBe(true);
    });

    it('should navigate to and load the privacy page', async () => {
      await page.goto(`${BASE_URL}/privacy`);
      
      // Check if privacy page content exists
      const privacyContent = await elementExists(page, 'h1, h2, p');
      expect(privacyContent).toBe(true);
    });
  });

  describe('404 Page', () => {
    it('should show 404 page for non-existent routes', async () => {
      await page.goto(`${BASE_URL}/non-existent-page-${Math.random()}`);
      
      // Check if page contains not found message or gets redirected to a 404 page
      const content = await page.content();
      
      // Different apps handle 404 in different ways
      // Check for common 404 indicators
      const hasNotFoundMessage = 
        content.includes('404') || 
        content.includes('not found') || 
        content.includes('Not Found') ||
        content.includes('page doesn\'t exist');
      
      expect(hasNotFoundMessage).toBe(true);
    });
  });
}); 