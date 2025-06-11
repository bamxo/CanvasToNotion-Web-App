/**
 * SignUp Component
 * 
 * This component handles the email-based user registration process.
 * It provides a form for users to enter their email and password,
 * with password visibility toggle functionality and password confirmation.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'
import styles from './SignUp.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg?url';
import eyeSlashIcon from '../assets/eye-slash.svg?url';
import arrowIcon from '../assets/arrow.svg?url';
import axios from 'axios';
import { mapFirebaseError, validateForm } from '../utils/errorMessages';
import { AUTH_ENDPOINTS, COOKIE_STATE_ENDPOINTS } from '../utils/api';
import { EXTENSION_ID } from '../utils/constants';
import { secureStoreToken } from '../utils/encryption';

// Add Chrome types
declare global {
  namespace chrome {
    namespace runtime {
      function sendMessage(extensionId: string, message: any): Promise<any>;
    }
  }
  interface Window {
    chrome: typeof chrome;
  }
}

const SignUp: React.FC = () => {
  // State for form data management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // State for error handling
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Handler for form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError('');
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate form using the utility function
    const validationError = validateForm(formData.email, formData.password, formData.confirmPassword);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      // First create the account
      const signupResponse = await axios.post(AUTH_ENDPOINTS.SIGNUP, {
        email: formData.email,
        password: formData.password,
        displayName: formData.email.split('@')[0] // Using email prefix as display name
      }, {
        withCredentials: true // Enable sending and receiving cookies
      });

      // If signup successful, automatically log in the user
      if (signupResponse.data) {
        try {
          // Perform automatic login with extension token request
          const loginResponse = await axios.post(AUTH_ENDPOINTS.LOGIN, {
            email: formData.email,
            password: formData.password,
            requestExtensionToken: true // Request extension token
          }, {
            withCredentials: true // Enable sending and receiving cookies
          });

          // Store the auth token
          if (loginResponse.data) {
            secureStoreToken('authToken', loginResponse.data.idToken);
            
            // Set the isAuthenticated cookie only in production
            if (import.meta.env.PROD) {
              await axios.post(
                COOKIE_STATE_ENDPOINTS.SET_AUTHENTICATED,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${loginResponse.data.idToken}`
                  },
                  withCredentials: true
                }
              );
            }
            
            // If we got an extension token, send it to the extension
            if (loginResponse.data.extensionToken) {
              console.log('Received extension token during signup, sending to extension...');
              try {
                await window.chrome.runtime.sendMessage(
                  EXTENSION_ID,
                  {
                    type: 'AUTH_TOKEN',
                    token: loginResponse.data.extensionToken
                  }
                );
                // Store the extension ID for future token refreshes
                localStorage.setItem('extensionId', EXTENSION_ID);
                console.log('Successfully sent token to extension');
              } catch (extError) {
                console.error('Failed to send token to extension:', extError);
                // Don't block signup if extension communication fails
              }
            }
            
            navigate('/get-started');
          }
        } catch (loginErr) {
          setError('Account created but automatic login failed. Please try logging in manually.');
          navigate('/login');
        }
      }
    } catch (err) {
      // Use the new error mapping utility
      const userFriendlyMessage = mapFirebaseError(err, 'Failed to create account. Please try again.');
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Handler for login page navigation
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header section */}
          <h1 className={styles.header}>Create an Account</h1>
          <p className={styles.subtext}>Just a few details to get started</p>

          {/* Registration form */}
          <form onSubmit={handleSubmit} className={styles['signup-form']}>
            {/* Error message display */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Email input field */}
            <div className={styles['form-group']}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="password">Password</label>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <img
                  src={showPassword ? eyeSlashIcon : eyeIcon}
                  alt="toggle password visibility"
                  className={styles['eye-icon']}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            {/* Confirm password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <img
                  src={showPassword ? eyeSlashIcon : eyeIcon}
                  alt="toggle password visibility"
                  className={styles['eye-icon']}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            {/* Submit button */}
            <button 
              type="submit" 
              className={styles['button-rectangle']}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login section for existing users */}
          <div className={styles['login-section']}>
            <span className={styles['login-text']}>Already have an account?</span>
            <div className={styles['login-link']} onClick={handleLogin}>
              Login
              <img src={arrowIcon} alt="arrow" className={styles['arrow-icon']} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp; 