import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './ConnectionSetup.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';

interface NotionPage {
  id: string;
  title: string;
}

interface UserInfo {
  email: string;
}

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

const ConnectionSetup: React.FC = () => {
  const navigate = useNavigate();
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Decode token to get user info
    const decodedToken = decodeJWT(authToken);
    if (decodedToken && decodedToken.email) {
      setUserInfo({ email: decodedToken.email });
    }

    // Verify token with backend
    const verifyAuth = async () => {
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
        if (!userInfo?.email) {
          if (axios.isAxiosError(err)) {
            if (err.response) {
              setError(`Authentication Error: ${err.response.data?.message || err.response.statusText}`);
            } else if (err.request) {
              setError('No response received from server. Please check your connection.');
            } else {
              setError(`Request Error: ${err.message}`);
            }
          } else {
            setError('An unexpected error occurred');
          }
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [navigate]);

  const handleNotionConnect = async () => {
    try {
      // Open Notion OAuth window
      const width = 490;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        'http://localhost:3000/api/auth/notion',
        'Notion Authorization',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      // Handle popup window events
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          // Fetch pages first before setting connection state
          fetchNotionPages();
        }
      }, 1000);
    } catch (err) {
      setError('Failed to connect to Notion. Please try again.');
    }
  };

  const fetchNotionPages = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/notion/pages', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      setPages(response.data.pages);
      // Only set connected state after successfully fetching pages
      setIsNotionConnected(true);
    } catch (err) {
      setError('Failed to fetch Notion pages. Please try again.');
    }
  };

  const handleConfirmConnection = async () => {
    if (!selectedPage) {
      setError('Please select a page for assignments');
      return;
    }

    try {
      await axios.post('http://localhost:3000/api/notion/setup', {
        pageId: selectedPage
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      navigate('/login-success');
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    }
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        {isLoading ? (
          <div className={styles.container}>
            <h1 className={styles.header}>Loading...</h1>
          </div>
        ) : error && !userInfo ? (
          <div className={styles.container}>
            <h1 className={styles.header}>Error</h1>
            <div className={styles.error}>{error}</div>
            <button 
              className={styles.buttonRectangle}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.headerContainer}>
              <h1 className={styles.header}>Welcome to Canvas to Notion!</h1>
              {/* {userInfo && (
                <p className={styles.subtext}>Signed in as {userInfo.email}</p>
              )} */}
            </div>

            {/* Error Message Display */}
            {error && <div className={styles.error}>{error}</div>}

            {/* Step 1: Notion Connection */}
            <div className={styles.stepSection}>
              <h2 className={styles.stepHeader}>Step 1: Connect your Notion account</h2>
              <button 
                className={`${styles.buttonRectangle} ${isNotionConnected ? styles.connected : ''}`}
                onClick={handleNotionConnect}
                disabled={isNotionConnected}
              >
                {isNotionConnected ? 'Connected to Notion ✓' : 'Connect to Notion'}
              </button>
              <p className={styles.helperText}>
                → Please allow access to the workspace you would like us to modify during the authorization.
              </p>
            </div>

            {/* Step 2: Page Selection */}
            <div className={styles.stepSection}>
              <h2 className={styles.stepHeader}>Step 2: Choose a Notion Page for Assignments</h2>
              <select
                className={styles.pageSelector}
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                disabled={!isNotionConnected}
              >
                <option value="">Select a page...</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    📄 {page.title}
                  </option>
                ))}
              </select>
              {selectedPage && (
                <div className={styles.selectedPage}>
                  📄 Selected Page: {pages.find(p => p.id === selectedPage)?.title}
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <button 
              className={`${styles.buttonRectangle} ${styles.confirmButton}`}
              onClick={handleConfirmConnection}
              disabled={!isNotionConnected || !selectedPage}
            >
              Confirm Connection
            </button>

            {/* Note */}
            <p className={styles.note}>
              Note: You can change this later in Settings.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ConnectionSetup; 