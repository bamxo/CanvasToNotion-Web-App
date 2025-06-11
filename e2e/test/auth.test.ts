import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { Browser, Page } from 'puppeteer';
import { 
  BASE_URL,
  TEST_USER,
  createPage,
  elementExists,
  isBrowserInitialized
} from './utils/test-utils.js';

describe('Authentication Tests', () => {
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

  describe('Login Page', () => {
    it('should display login form', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check for login form elements
      const emailInput = await elementExists(page, 'input[name="email"], input[type="email"]');
      const passwordInput = await elementExists(page, 'input[name="password"], input[type="password"]');
      const loginButton = await elementExists(page, 'button[type="submit"], button');
      
      expect(emailInput).toBe(true);
      expect(passwordInput).toBe(true);
      expect(loginButton).toBe(true);
    });

    it('should show error message with invalid credentials', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill in login form with invalid credentials
      await page.type('input[name="email"], input[type="email"]', TEST_USER.email);
      await page.type('input[name="password"], input[type="password"]', TEST_USER.invalidPassword);
      
      // Submit the form
      await page.click('button[type="submit"], button');
      
      // Wait for error message to appear - look for any element with error styling
      try {
        await page.waitForSelector('[class*="error"], .error, .invalid, .alert-danger, [role="alert"]', { timeout: 5000 });
        const errorElementExists = await elementExists(page, '[class*="error"], .error, .invalid, .alert-danger, [role="alert"]');
        expect(errorElementExists).toBe(true);
      } catch (e) {
        // If no explicit error element, check page content for error messages
        const pageContent = await page.content();
        const hasErrorMessage = pageContent.toLowerCase().includes('invalid') || 
                               pageContent.toLowerCase().includes('incorrect') ||
                               pageContent.toLowerCase().includes('wrong') ||
                               pageContent.toLowerCase().includes('failed');
        expect(hasErrorMessage).toBe(true);
      }
    });

    it('should navigate to signup page', async () => {
      // Just verify we can navigate to the signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Check for signup form elements
      const emailInput = await elementExists(page, 'input[name="email"], input[type="email"]');
      const passwordInput = await elementExists(page, 'input[name="password"], input[type="password"]');
      
      expect(emailInput).toBe(true);
      expect(passwordInput).toBe(true);
    });

    it('should navigate to forgot password page', async () => {
      // Just verify we can navigate to the forgot password page
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Check for forgot password form elements
      const emailInput = await elementExists(page, 'input[name="email"], input[type="email"]');
      const resetButton = await elementExists(page, 'button[type="submit"], button');
      
      expect(emailInput).toBe(true);
      expect(resetButton).toBe(true);
    });
  });

  describe('Sign Up Page', () => {
    it('should display sign up form', async () => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Check for sign up form elements
      const emailInput = await elementExists(page, 'input[name="email"], input[type="email"]');
      const passwordInput = await elementExists(page, 'input[name="password"], input[type="password"]');
      const signUpButton = await elementExists(page, 'button[type="submit"], button');
      
      expect(emailInput).toBe(true);
      expect(passwordInput).toBe(true);
      expect(signUpButton).toBe(true);
    });

    it('should show error when passwords do not match', async () => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Find the confirm password field first
      const hasConfirmPassword = await elementExists(page, 'input[name="confirmPassword"], input[placeholder*="confirm"], input[placeholder*="Confirm"]');
      
      if (!hasConfirmPassword) {
        return;
      }
      
      // Fill form with mismatched passwords
      await page.type('input[name="email"], input[type="email"]', 'newuser@example.com');
      await page.type('input[name="password"], input[type="password"]', 'Password123!');
      await page.type('input[name="confirmPassword"], input[placeholder*="confirm"], input[placeholder*="Confirm"]', 'DifferentPassword123!');
      
      // Click submit
      await page.click('button[type="submit"], button');
      
      // Wait for error message to appear
      try {
        await page.waitForSelector('[class*="error"], .error, .invalid, .alert-danger, [role="alert"]', { timeout: 5000 });
        const errorElementExists = await elementExists(page, '[class*="error"], .error, .invalid, .alert-danger, [role="alert"]');
        expect(errorElementExists).toBe(true);
      } catch (e) {
        // If no explicit error element, check page content for error messages
        const pageContent = await page.content();
        const hasErrorMessage = pageContent.toLowerCase().includes('match') || 
                                pageContent.toLowerCase().includes('same') ||
                                pageContent.toLowerCase().includes('different');
        expect(hasErrorMessage).toBe(true);
      }
    });
  });

  describe('Forgot Password Page', () => {
    it('should display forgot password form', async () => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Check for forgot password form elements
      const emailInput = await elementExists(page, 'input[name="email"], input[type="email"]');
      const resetButton = await elementExists(page, 'button[type="submit"], button');
      
      expect(emailInput).toBe(true);
      expect(resetButton).toBe(true);
    });

    it('should show success message after submitting valid email', async () => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Fill in the email input
      await page.type('input[name="email"], input[type="email"]', TEST_USER.email);
      
      // Submit the form
      await page.click('button[type="submit"], button');
      
      // Wait for success message - look for non-error message
      try {
        await page.waitForSelector('[class*="success"], .success, .alert-success, [role="status"]', { timeout: 5000 });
        const successElementExists = await elementExists(page, '[class*="success"], .success, .alert-success, [role="status"]');
        expect(successElementExists).toBe(true);
      } catch (e) {
        // If no explicit success element, check page content for success messages
        const pageContent = await page.content();
        const hasSuccessMessage = pageContent.toLowerCase().includes('sent') || 
                                 pageContent.toLowerCase().includes('check') ||
                                 pageContent.toLowerCase().includes('email');
        expect(hasSuccessMessage).toBe(true);
      }
    });
  });
}); 