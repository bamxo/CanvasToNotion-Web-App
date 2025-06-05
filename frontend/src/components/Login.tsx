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
import { AUTH_ENDPOINTS } from '../utils/api';

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
    // Listen for messages from the extension
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_ID') {
        console.log('Received extension ID:', event.data.extensionId);
        localStorage.setItem('extensionId', event.data.extensionId);
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

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
      // Send the ID token to your backend
      const backendResponse = await axios.post('http://localhost:3000/api/auth/google', {
        idToken: response.credential,
        requestExtensionToken: true,
        extensionId: localStorage.getItem('extensionId') || EXTENSION_ID
      });

      if (backendResponse.data && backendResponse.data.idToken) {
        // Store the ID token for authentication
        localStorage.setItem('authToken', backendResponse.data.idToken);

        // If we got an extension token, send it to the extension
        if (backendResponse.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            const extensionId = localStorage.getItem('extensionId') || EXTENSION_ID;
            await window.chrome.runtime.sendMessage(
              extensionId,
              {
                type: 'AUTH_TOKEN',
                token: backendResponse.data.extensionToken
              }
            );
            console.log('Successfully sent token to extension');
          } catch (extError) {
            console.error('Failed to send token to extension:', extError);
            // Don't block login if extension communication fails
          }
        }

        // Redirect to settings page
        navigate('/settings');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      const userFriendlyMessage = mapFirebaseError(error, 'Google sign in failed. Please try again.');
      setError(userFriendlyMessage);
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
        requestExtensionToken: true,
        extensionId: localStorage.getItem('extensionId') || EXTENSION_ID
      });

      if (response.data && response.data.idToken) {
        // Store the auth token in localStorage
        localStorage.setItem('authToken', response.data.idToken);
        
        // If we got an extension token, send it to the extension
        if (response.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            const extensionId = localStorage.getItem('extensionId') || EXTENSION_ID;
            await window.chrome.runtime.sendMessage(
              extensionId,
              {
                type: 'AUTH_TOKEN',
                token: response.data.extensionToken
              }
            );
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
