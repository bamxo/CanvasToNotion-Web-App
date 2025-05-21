/**
 * Login Component
 * 
 * This component handles user authentication through both email/password
 * and third-party (Google) authentication methods. It provides a form for
 * existing users to log in and navigation options for password recovery
 * and new user registration.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg?url';
import eyeSlashIcon from '../assets/eye-slash.svg?url';
import googleIcon from '../assets/google.svg?url';
import arrowIcon from '../assets/arrow.svg?url';
import authButtons from '../data/authButtons.json';
import { EXTENSION_ID } from '../utils/constants';

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

  /**
   * Handles input changes in the form
   * Updates the formData state with the new values
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError('');
  };

  /**
   * Handles form submission
   * Authenticates user with the backend login endpoint
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: formData.email,
        password: formData.password,
        requestExtensionToken: true // Request token for extension
      });

      // If login successful, store the token and redirect
      if (response.data) {
        // Store the auth token in localStorage
        localStorage.setItem('authToken', response.data.idToken);
        
        // If we got an extension token, send it to the extension
        if (response.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            // Send token to extension
            console.log('Sending token to extension ID:', EXTENSION_ID);
            const result = await window.chrome.runtime.sendMessage(
              EXTENSION_ID, // Extension ID from constants
              {
                type: 'AUTH_TOKEN',
                token: response.data.extensionToken
              }
            );
            console.log('Extension response:', result);
          } catch (extError) {
            console.error('Failed to send token to extension:', extError);
            // Log more details about the error
            if (extError instanceof Error) {
              console.error('Error details:', {
                name: extError.name,
                message: extError.message,
                stack: extError.stack
              });
            }
            // Don't block login if extension communication fails
          }
        } else {
          console.log('No extension token received in login response');
        }

        // Redirect to login success page
        navigate('/settings');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Invalid email or password');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigates to the signup page when user clicks "Sign Up"
   */
  const handleSignUp = () => {
    navigate('/signup');
  };

  // Add Google OAuth popup handler
  const handleGoogleLogin = async () => {
    const width = 490;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      'http://localhost:3000/api/auth/google',
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    // Handle popup window events
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        // Optionally refresh user data or handle completion
        window.location.reload();
      }
    }, 1000);

    // Handle message from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin === window.location.origin) {
        if (event.data.type === 'googleAuthSuccess') {
          if (event.data.token) {
            localStorage.setItem('authToken', event.data.token);
            
            // Request extension token
            try {
              const response = await axios.post('http://localhost:3000/api/auth/login', {
                idToken: event.data.token,
                requestExtensionToken: true
              });

              if (response.data.extensionToken) {
                // Send token to extension
                await window.chrome.runtime.sendMessage(
                  EXTENSION_ID,
                  {
                    type: 'AUTH_TOKEN',
                    token: response.data.extensionToken
                  }
                );
                console.log('Successfully sent token to extension');
              }
            } catch (extError) {
              console.error('Failed to get or send extension token:', extError);
              // Don't block login if extension communication fails
            }
          }
          if (popup) popup.close();
          navigate('/login-success');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearInterval(checkPopup);
      window.removeEventListener('message', handleMessage);
    };
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

          {/* Google Authentication Button */}
          {authButtons.buttons
            .filter(button => button.method === 'Google')
            .map((_, index) => (
              <button 
                key={index} 
                className={styles['auth-button']}
                onClick={handleGoogleLogin}
              >
                <img src={googleIcon} alt="Google icon" className={styles['button-icon']} />
                Sign In with Google
              </button>
          ))}

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
