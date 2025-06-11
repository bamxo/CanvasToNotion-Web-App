# Canvas to Notion E2E Tests

This directory contains end-to-end tests for the Canvas to Notion web application using Puppeteer and Vitest.

## Requirements

- Node.js (v16+)
- npm (v7+)
- Running frontend application (see below)

## Setup

1. Install dependencies:

```bash
npm install
```

## Running Tests

Before running the tests, make sure the frontend application is running:

```bash
# From the project root
cd frontend
npm run dev
```

This will start the frontend application on `http://localhost:5173`.

### Run all tests

```bash
npm test
```

### Run tests in watch mode (during development)

```bash
npm run test:watch
```

### Run specific test files

```bash
npm test -- test/auth.test.ts
npm test -- test/settings.test.ts
```

## Test Files

- `auth.test.ts` - Tests for authentication features (login, signup, password reset)
- `notion-token.test.ts` - Tests for Notion token management (connect/disconnect, token addition/removal)
- `app-navigation.test.ts` - Tests for general app navigation and features
- `settings.test.ts` - Tests for user settings (profile info, logout, account management)

## Test Structure

The tests are designed to be resilient to minor UI changes, focusing on functionality rather than exact implementation details. They use flexible selectors and adapt to different UI implementations:

1. **Test Utilities** (`test/utils/test-utils.ts`) - Helper functions for browser setup, page creation, and element checking
2. **Global Setup** (`test/setup.ts`) - Handles browser initialization for all tests
3. **Test Files** - Individual test suites focusing on specific functionality

## Important Notes

1. The tests require valid test credentials to be set up in `test/utils/test-utils.ts`.
2. For the Notion token tests, you might need to manually set up a Notion account connection first.
3. These tests use a headless browser by default. If you want to see the browser while tests run, change the `headless` option to `false` in `test/utils/test-utils.ts`.

## Troubleshooting

If tests are failing, check the following:

1. Make sure the frontend application is running at `http://localhost:5173`
2. Verify the test credentials in `test/utils/test-utils.ts` are valid
3. Check if the HTML selectors in the tests match your current UI implementation 