// Application-wide constants
import { IS_CROSS_ORIGIN_BACKEND } from './api';

// Determine if we're in production based on environment
export const IS_PRODUCTION = import.meta.env.PROD;

// Explicit override (set VITE_EXTENSION_ID at build time) for when the locally
// loaded unpacked extension's id differs from the default dev id below — get it
// from chrome://extensions.
const OVERRIDE_EXTENSION_ID = (import.meta.env.VITE_EXTENSION_ID as string | undefined)?.trim();

export const EXTENSION_ID =
  OVERRIDE_EXTENSION_ID ||
  // A production build pointed at an overridden backend (dev:vercel) is still a
  // local test — target the unpacked extension, not the published one.
  (IS_PRODUCTION && !IS_CROSS_ORIGIN_BACKEND
    ? 'nomigaendijedpgeohegnfpplcglgdcp'  // production extension id
    : 'jjifklpgpnmokeffammagniaiicffhib'); // development extension id (unpacked)

// URLs for different environments
export const BASE_URL = IS_PRODUCTION
  ? 'https://canvastonotion.io'
  : 'http://localhost:5173';

// Notion expects exactly these redirect URIs as configured in their OAuth settings
export const NOTION_REDIRECT_URI = IS_PRODUCTION
  ? 'https://canvastonotion.io/settings'
  : 'http://localhost:5173/settings'; 