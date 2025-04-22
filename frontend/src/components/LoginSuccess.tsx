/**
 * TEMPORARY COMPONENT - FOR TESTING PURPOSES ONLY
 * 
 * This component is a temporary implementation used to verify that:
 * 1. Authentication flow is working correctly
 * 2. JWT tokens are being stored and can be decoded
 * 3. Protected routes are functioning as expected
 * 
 * This should be replaced with proper dashboard/home component
 * in the production version of the application.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './LoginSuccess.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';

interface UserInfo {
  email: string;
  // Add more user info fields as needed
}

/**
 * Temporary utility function to decode JWT token
 * This is for testing/verification purposes only
 * In production, token handling should be done through a proper auth service
 */
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Temporary component to display login success and token information
 * This is used to verify the authentication flow is working
 * Should be replaced with actual post-login landing page
 */
const LoginSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Temporary: Decode token to display email for testing
    const decodedToken = decodeJWT(authToken);
    if (decodedToken && decodedToken.email) {
      setUserInfo({ email: decodedToken.email });
    }

    // Temporary API call to verify backend communication
    // This should be replaced with proper user data fetching in production
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('http://localhost:5173/api/auth/user', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data && response.data.email) {
          setUserInfo(response.data);
        }
      } catch (err) {
        // Don't overwrite the email we got from the token
        if (!userInfo?.email) {
          if (axios.isAxiosError(err)) {
            if (err.response) {
              setError(`Server Error: ${err.response.data?.message || err.response.statusText}`);
            } else if (err.request) {
              setError('No response received from server. Please check if the backend server is running.');
            } else {
              setError(`Request Error: ${err.message}`);
            }
          } else {
            setError('An unexpected error occurred');
          }
        }
        console.error('Error fetching user info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  // Temporary logout handler for testing
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleRetry = () => {
    setError('');
    setIsLoading(true);
    window.location.reload();
  };

  const renderContent = () => {
    if (error && !userInfo) {
      return (
        <div className={styles.container}>
          <h1 className={styles.title}>Error</h1>
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
          </div>
          <div className={styles.buttonGroup}>
            <button className={styles.button} onClick={handleRetry}>
              Retry
            </button>
            <button className={`${styles.button} ${styles.secondaryButton}`} onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Login Successful!</h1>
        {userInfo ? (
          <>
            <h2 className={styles.subtitle}>User Information</h2>
            <div className={styles.infoContainer}>
              <p className={styles.infoItem}>
                <strong>Email: </strong> {userInfo.email}
              </p>
              <p className={styles.infoItem}>
                <strong>Auth Token: </strong>
                <span className={styles.tokenText}>
                  {localStorage.getItem('authToken')?.substring(0, 20)}...
                </span>
              </p>
            </div>
          </>
        ) : (
          <p className={styles.infoItem}>
            {isLoading ? 'Loading user information...' : 'No user information available'}
          </p>
        )}
        <div className={styles.buttonGroup}>
          <button className={styles.button} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        {renderContent()}
      </div>
    </>
  );
};

export default LoginSuccess; 