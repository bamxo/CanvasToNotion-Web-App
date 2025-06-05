/**
 * Lookup Component
 * 
 * This component serves as the initial signup/authentication page where users can choose
 * their preferred method of creating an account. It provides options for different
 * authentication methods and a link to the login page for existing users.
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import styles from './Lookup.module.css'
import googleIcon from '../assets/google.svg?url';
import mailIcon from '../assets/Mail.svg?url';
import arrowIcon from '../assets/arrow.svg?url';
import { API_URL } from '../utils/constants';
import { mapFirebaseError } from '../utils/errorMessages';

interface GoogleSignInResponse {
  credential: string;
  select_by: string;
}

const Lookup: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [success, setSuccess] = React.useState<string>('');
  const [selectedPage, setSelectedPage] = React.useState<string>('');
  const [userInfo, setUserInfo] = React.useState<any>({});

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
    let isMounted = true;

    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: (response: GoogleSignInResponse) => {
              if (isMounted) {
                handleGoogleSignIn(response);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            prompt_parent_id: 'google-signin-container'
          });
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
          if (isMounted) {
            setError('Failed to initialize Google Sign-In. Please try again.');
          }
        }
      }
    };

    initializeGoogleSignIn();

    return () => {
      isMounted = false;
    };
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
        requestExtensionToken: true
      });

      if (backendResponse.data && backendResponse.data.idToken) {
        // Store the ID token for authentication
        localStorage.setItem('authToken', backendResponse.data.idToken);

        // If we got an extension token, send it to the extension
        if (backendResponse.data.extensionToken) {
          console.log('Received extension token, attempting to send to extension...');
          try {
            const extensionId = localStorage.getItem('extensionId');
            if (extensionId) {
              await chrome.runtime.sendMessage(
                extensionId,
                {
                  type: 'AUTH_TOKEN',
                  token: backendResponse.data.extensionToken
                }
              );
              console.log('Successfully sent token to extension');
            } else {
              console.warn('No extension ID found in localStorage');
            }
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

  // Handler for email signup navigation
  const handleEmailSignup = () => {
    navigate('/signup');
  };

  // Handler for login page navigation
  const handleLogin = () => {
    navigate('/login');
  };

  const handleSync = async () => {
    if (!selectedPage) {
      setError('Please select a Notion page first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const extensionId = localStorage.getItem('extensionId');
      if (extensionId) {
        await chrome.runtime.sendMessage(extensionId, {
          type: 'SYNC_TO_NOTION',
          data: {
            email: userInfo.email,
            pageId: selectedPage
          }
        });
        setSuccess('Sync initiated successfully!');
      } else {
        setError('Extension ID not found. Please try signing in again.');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setError(mapFirebaseError(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <h1 className={styles.header}>Create an Account</h1>
          <p className={styles.subtext}>Just a few details to get started</p>

          {/* Error Message Display */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Email Signup Button */}
          <button 
            className={styles['button-rectangle']}
            onClick={handleEmailSignup}
            disabled={isLoading}
          >
            <img src={mailIcon} alt="Email" className={styles['button-icon']} />
            Sign Up with Email
          </button>

          {/* Google Sign-In Button */}
          <div id="google-signin-container">
            <button 
              className={styles['button-rectangle']}
              onClick={() => {
                try {
                  window.google?.accounts?.id?.prompt();
                } catch (error) {
                  console.error('Error prompting Google Sign-In:', error);
                  setError('Failed to start Google Sign-In. Please try again.');
                }
              }}
              disabled={isLoading}
            >
              <img src={googleIcon} alt="Google" className={styles['button-icon']} />
              Sign Up with Google
            </button>
          </div>

          {/* Divider section between auth buttons and login link */}
          <div className={styles.divider}>
            <div className={styles['divider-line']}></div>
            <div className={styles['divider-text']}>Or</div>
            <div className={styles['divider-line']}></div>
          </div>

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
  )
}

export default Lookup; 