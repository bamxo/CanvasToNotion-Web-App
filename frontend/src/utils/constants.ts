// Application-wide constants

// Determine if we're in production based on environment
export const IS_PRODUCTION = import.meta.env.PROD;

export const EXTENSION_ID = IS_PRODUCTION 
  ? 'nomigaendijedpgeohegnfpplcglgdcp' // production extension id
  : 'nomigaendijedpgeohegnfpplcglgdcp'; // development extension id

// URLs for different environments
export const BASE_URL = IS_PRODUCTION 
  ? 'https://canvastonotion.io' 
  : 'http://localhost:5173';

// Notion expects exactly these redirect URIs as configured in their OAuth settings
export const NOTION_REDIRECT_URI = IS_PRODUCTION
  ? 'https://canvastonotion.io/settings'
  : 'http://localhost:5173/settings'; 