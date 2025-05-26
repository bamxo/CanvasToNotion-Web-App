/**
 * Error Message Mapper
 * 
 * This utility function maps Firebase system error codes to user-friendly messages
 * that are easier for users to understand and act upon.
 */

/**
 * Maps system error codes to user-friendly messages
 * @param systemErrorCode - The raw error code from Firebase
 * @returns A user-friendly error message
 */
export const getErrorMessage = (systemErrorCode: string): string => {
  const errorMap: Record<string, string> = {
    // Authentication errors
    'INVALID_LOGIN_CREDENTIALS': 'Invalid email or password. Please check your credentials and try again.',
    'EMAIL_NOT_FOUND': 'No account found with this email address. Please check your email or create a new account.',
    'INVALID_PASSWORD': 'Incorrect password. Please try again.',
    'USER_NOT_FOUND': 'No account found with this email address.',
    'INVALID_EMAIL': 'Please enter a valid email address.',
    'EMAIL_EXISTS': 'An account with this email already exists. Please try logging in instead.',
    'EMAIL_ALREADY_EXISTS': 'An account with this email already exists. Please try logging in instead.',
    'WEAK_PASSWORD': 'Password is too weak. Please choose a stronger password.',
    'INVALID_PASSWORD_HASH': 'Invalid password format. Please try again.',
    'PASSWORD_LOGIN_DISABLED': 'Password login is currently disabled for this account.',
    
    // Account management errors
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many failed attempts. Please try again later.',
    'USER_DISABLED': 'This account has been disabled. Please contact support.',
    'OPERATION_NOT_ALLOWED': 'This operation is not allowed. Please contact support.',
    'EXPIRED_ACTION_CODE': 'This link has expired. Please request a new one.',
    'INVALID_ACTION_CODE': 'Invalid or expired link. Please request a new one.',
    
    // Network and server errors
    'NETWORK_REQUEST_FAILED': 'Network error. Please check your connection and try again.',
    'INTERNAL_ERROR': 'Something went wrong. Please try again later.',
    'QUOTA_EXCEEDED': 'Too many requests. Please try again later.',
    'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
    
    // Token and session errors
    'INVALID_ID_TOKEN': 'Your session has expired. Please log in again.',
    'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
    'CREDENTIAL_TOO_OLD_LOGIN_AGAIN': 'Please log in again to continue.',
    
    // Multi-factor authentication errors
    'MISSING_PHONE_NUMBER': 'Phone number is required for verification.',
    'INVALID_PHONE_NUMBER': 'Please enter a valid phone number.',
    'MISSING_VERIFICATION_CODE': 'Please enter the verification code.',
    'INVALID_VERIFICATION_CODE': 'Invalid verification code. Please try again.',
    'CODE_EXPIRED': 'The verification code has expired. Please request a new one.',
    
    // Custom validation errors (not from Firebase)
    'PASSWORDS_DO_NOT_MATCH': 'Passwords do not match. Please try again.',
    'PASSWORD_TOO_SHORT': 'Password must be at least 8 characters long.',
    'REQUIRED_FIELD': 'This field is required.',
  };

  return errorMap[systemErrorCode] || 'An unexpected error occurred. Please try again.';
};

/**
 * Extracts and maps Firebase error messages from axios error responses
 * @param error - The error object from axios or other sources
 * @param fallbackMessage - Default message if no specific mapping is found
 * @returns A user-friendly error message
 */
export const mapFirebaseError = (error: unknown, fallbackMessage = 'An unexpected error occurred'): string => {
  // Handle axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) {
      return getErrorMessage(axiosError.response.data.error);
    }
  }
  
  // Handle direct error codes
  if (typeof error === 'string') {
    return getErrorMessage(error);
  }
  
  // Handle Firebase error objects with code property
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string };
    const errorCode = firebaseError.code.replace('auth/', '').toUpperCase();
    return getErrorMessage(errorCode);
  }
  
  // Handle error messages directly
  if (error && typeof error === 'object' && 'message' in error) {
    const messageError = error as { message: string };
    return getErrorMessage(messageError.message);
  }
  
  return fallbackMessage;
};

/**
 * Validates form inputs and returns appropriate error messages
 * @param email - Email input
 * @param password - Password input
 * @param confirmPassword - Confirm password input (optional, for signup)
 * @returns Error message or null if valid
 */
export const validateForm = (email: string, password: string, confirmPassword?: string): string | null => {
  if (!email.trim()) {
    return getErrorMessage('REQUIRED_FIELD');
  }
  
  if (!password.trim()) {
    return getErrorMessage('REQUIRED_FIELD');
  }
  
  if (password.length < 8) {
    return getErrorMessage('PASSWORD_TOO_SHORT');
  }
  
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return getErrorMessage('PASSWORDS_DO_NOT_MATCH');
  }
  
  return null;
}; 