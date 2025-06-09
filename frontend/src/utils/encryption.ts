/**
 * Encryption Utilities
 * 
 * This module provides functions for encrypting and decrypting sensitive data
 * like authentication tokens before storing them in localStorage.
 * 
 * In development mode, encryption is bypassed for easier debugging.
 */

// Check if we're in production mode
const isProduction = import.meta.env.PROD;

// Generate a stable encryption key based on browser/device fingerprinting
const getEncryptionKey = (): string => {
  // Using a combination of browser-specific values to create a reasonably unique key
  // This is not perfect security but provides a layer of obfuscation
  const keyBase = [
    navigator.userAgent,
    navigator.language,
    window.screen.colorDepth,
    window.screen.width + 'x' + window.screen.height
  ].join('|');
  
  // Simple hash function to convert the key base to a consistent string
  let hash = 0;
  for (let i = 0; i < keyBase.length; i++) {
    const char = keyBase.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

/**
 * Encrypts a string using a simple XOR cipher
 * @param text - The text to encrypt (typically an auth token)
 * @returns The encrypted string in base64 format
 */
export const encryptToken = (text: string): string => {
  if (!text) return '';
  
  // Skip encryption in development mode
  if (!isProduction) return text;
  
  try {
    const key = getEncryptionKey();
    let result = '';
    
    // Simple XOR encryption
    for (let i = 0; i < text.length; i++) {
      // Use modulo to repeat the key if it's shorter than the text
      const keyChar = key.charCodeAt(i % key.length);
      const textChar = text.charCodeAt(i);
      const encryptedChar = textChar ^ keyChar;
      result += String.fromCharCode(encryptedChar);
    }
    
    // Convert to base64 for safe storage
    return btoa(result);
  } catch (error) {
    console.error('Encryption failed:', error);
    // Fall back to unencrypted in case of error
    return text;
  }
}

/**
 * Decrypts a string that was encrypted with encryptToken
 * @param encryptedText - The encrypted text to decrypt
 * @returns The original decrypted string
 */
export const decryptToken = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  // Skip decryption in development mode
  if (!isProduction) return encryptedText;
  
  try {
    // Convert from base64
    const text = atob(encryptedText);
    const key = getEncryptionKey();
    let result = '';
    
    // XOR decryption (same as encryption)
    for (let i = 0; i < text.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const textChar = text.charCodeAt(i);
      const decryptedChar = textChar ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    
    return result;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return the encrypted text if decryption fails
    return encryptedText;
  }
}

/**
 * Securely stores a token in localStorage with encryption in production
 * and without encryption in development
 * @param key - The localStorage key to use
 * @param token - The token to store
 */
export const secureStoreToken = (key: string, token: string): void => {
  if (!token) {
    localStorage.removeItem(key);
    return;
  }
  
  const valueToStore = isProduction ? encryptToken(token) : token;
  localStorage.setItem(key, valueToStore);
}

/**
 * Retrieves and decrypts a token from localStorage in production
 * or returns it directly in development
 * @param key - The localStorage key to retrieve
 * @returns The token, or null if not found
 */
export const secureGetToken = (key: string): string | null => {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) return null;
  
  return isProduction ? decryptToken(storedValue) : storedValue;
}

/**
 * Removes a token from localStorage
 * @param key - The localStorage key to remove
 */
export const secureRemoveToken = (key: string): void => {
  localStorage.removeItem(key);
} 