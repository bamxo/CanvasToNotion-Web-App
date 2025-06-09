/**
 * Login Component
 * 
 * This component handles user authentication through both email/password
 * and third-party (Google) authentication methods. It provides a form for
 * existing users to log in and navigation options for password recovery
 * and new user registration.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg?url';
import eyeSlashIcon from '../assets/eye-slash.svg?url';
import googleIcon from '../assets/google.svg?url';
import arrowIcon from '../assets/arrow.svg?url';
import { EXTENSION_ID } from '../utils/constants';
import { mapFirebaseError } from '../utils/errorMessages';
import { AUTH_ENDPOINTS, COOKIE_STATE_ENDPOINTS } from '../utils/api';
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
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInResponse {
  credential: string;
  select_by: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  // State for password visibility toggle
  const [showPassword, setShowPassword] = React.useState(false);
  // State to manage form inputs
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  });
  // State for error handling and loading
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true
      });
    }
  }, []);

  const handleGoogleSignIn = async (response: GoogleSignInResponse) => {
    if (!response.credential) {
      setError('Failed to get Google credentials');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // For debugging - log the endpoint we're calling
      console.log('Calling Google auth endpoint:', AUTH_ENDPOINTS.GOOGLE);
      console.log('Is production environment:', import.meta.env.PROD);
      console.log('Google credential token first 10 chars:', response.credential.substring(0, 10) + '...');
      console.log('VITE_GOOGLE_CLIENT_ID exists:', !!import.meta.env.VITE_GOOGLE_CLIENT_ID);
      
      // Send the ID token to your backend
      const backendResponse = await axios.post(AUTH_ENDPOINTS.GOOGLE, {
        idToken: response.credential,
        requestExtensionToken: true
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true, // Enable sending and receiving cookies
        validateStatus: (_) => true // Don't throw error for any status code
      });

      console.log('Google auth response status:', backendResponse.status);
      console.log('Google auth response data:', backendResponse.data);
      
      if (backendResponse.status !== 200) {
        throw new Error(`Server returned status ${backendResponse.status}: ${JSON.stringify(backendResponse.data)}`);
      }
      
      if (backendResponse.data && backendResponse.data.idToken) {
        // Store the ID token for authentication
        secureStoreToken('authToken', backendResponse.data.idToken);
        
        // Set the isAuthenticated cookie
        await axios.post(
          COOKIE_STATE_ENDPOINTS.SET_AUTHENTICATED,
          {},
          {
            headers: {
              Authorization: `Bearer ${backendResponse.data.idToken}`
            },
            withCredentials: true
          }
        );

        // If we got an extension token, send it to the extension
        if (backendResponse.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            await window.chrome.runtime.sendMessage(
              EXTENSION_ID,
              {
                type: 'AUTH_TOKEN',
                token: backendResponse.data.extensionToken
              }
            );
            // Store the extension ID for future token refreshes
            localStorage.setItem('extensionId', EXTENSION_ID);
            console.log('Successfully sent token to extension');
          } catch (extError) {
            console.error('Failed to send token to extension:', extError);
            // Don't block login if extension communication fails
          }
        }

        // Redirect to settings page
        navigate('/settings');
      } else {
        throw new Error('Missing idToken in response: ' + JSON.stringify(backendResponse.data));
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      // Log more details about the error
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      }
      const userFriendlyMessage = mapFirebaseError(error, 'Google sign in failed. Please try again.');
      setError(userFriendlyMessage + (error.message ? `: ${error.message}` : ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(AUTH_ENDPOINTS.LOGIN, {
        email: formData.email,
        password: formData.password,
        requestExtensionToken: true
      }, {
        withCredentials: true // Enable sending and receiving cookies
      });

      if (response.data && response.data.idToken) {
        // Store the auth token securely
        secureStoreToken('authToken', response.data.idToken);
        
        // Set the isAuthenticated cookie
        await axios.post(
          COOKIE_STATE_ENDPOINTS.SET_AUTHENTICATED,
          {},
          {
            headers: {
              Authorization: `Bearer ${response.data.idToken}`
            },
            withCredentials: true
          }
        );
        
        // If we got an extension token, send it to the extension
        if (response.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            await window.chrome.runtime.sendMessage(
              EXTENSION_ID,
              {
                type: 'AUTH_TOKEN',
                token: response.data.extensionToken
              }
            );
            // Store the extension ID for future token refreshes
            localStorage.setItem('extensionId', EXTENSION_ID);
            console.log('Successfully sent token to extension');
          } catch (extError) {
            console.error('Failed to send token to extension:', extError);
            // Don't block login if extension communication fails
          }
        }

        // Redirect to settings page
        navigate('/settings');
      }
    } catch (err) {
      const userFriendlyMessage = mapFirebaseError(err, 'Login failed. Please try again.');
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header Section */}
          <h1 className={styles.header}>Welcome Back</h1>
          <p className={styles.subtext}>Login to your account</p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className={styles['login-form']}>
            {/* Error Message Display */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Email Input Field */}
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

            {/* Password Input Field with Toggle Visibility */}
            <div className={styles['form-group']}>
              <div className={styles['password-header']}>
                <label htmlFor="password">Password</label>
                <span className={styles['forgot-password']} onClick={() => navigate('/forgot-password')}>
                  Forgot Password?
                </span>
              </div>
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

            <button 
              type="submit" 
              className={styles['button-rectangle']}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Alternative Authentication Options */}
          <div className={styles.divider}>
            <div className={styles['divider-line']}></div>
            <div className={styles['divider-text']}>Or</div>
            <div className={styles['divider-line']}></div>
          </div>

          {/* Google Sign-In Button */}
          <button 
            className={styles['auth-button']}
            onClick={() => window.google?.accounts?.id?.prompt()}
            disabled={isLoading}
          >
            <img src={googleIcon} alt="Google" className={styles['button-icon']} />
            Sign In with Google
          </button>

          {/* Sign Up Section */}
          <div className={styles['signup-section']}>
            <span className={styles['signup-text']}>New to Canvas to Notion?</span>
            <div className={styles['signup-link']} onClick={handleSignUp}>
              Sign Up
              <img src={arrowIcon} alt="arrow" className={styles['arrow-icon']} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
