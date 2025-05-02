import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SiNotion } from 'react-icons/si';
import { FaBook, FaLock, FaPuzzlePiece, FaThumbtack } from 'react-icons/fa';
import styles from './ConnectionSetup.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';

interface UserInfo {
  email: string;
}

const C2NIcon = () => (
  <svg width="20" height="20" viewBox="0 0 184 108" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.0396 49.1958C13.0396 24.3373 21.2914 16.2918 33.0502 16.2918C44.8089 16.2918 49.8632 18.5611 58.9401 16.6013V40.6346C52.7513 37.3339 46.8719 35.9929 43.2617 35.9929C39.6516 35.9929 38.1044 37.6433 38.1044 40.944C38.1044 44.2447 40.0642 45.5856 43.2617 45.5856C46.4593 45.5856 52.7513 44.9668 58.9401 43.6258V78.3865C49.8632 76.4267 42.1271 78.6959 33.0502 78.6959C23.9732 78.6959 13.0396 67.6592 13.0396 49.0927V49.1958Z" fill="#F05323"/>
    <path d="M84.1081 36.3531C84.1081 34.3933 82.4577 33.7744 79.3633 33.7744C76.2689 33.7744 69.4612 36.1468 63.8912 42.6451L63.4786 17.1677C70.1832 21.0873 81.8388 16.2394 91.9473 16.2394C102.056 16.2394 106.594 20.159 106.594 31.0926C106.594 51.1032 85.5521 43.5734 85.5521 50.1749C85.5521 56.7763 87.5119 53.3724 90.1938 53.3724C94.7323 53.3724 101.643 50.6906 106.697 46.2553L105.975 76.89H62.5503V57.8078C62.5503 35.4248 83.9018 43.1608 83.9018 36.4563L84.1081 36.3531Z" fill="#F05323"/>
    <path d="M111.958 18.2547H125.058C132.587 18.2547 139.395 26.9191 140.014 40.5345C140.22 44.6604 140.633 50.7461 143.211 50.7461C147.75 50.7461 142.283 27.9505 140.942 18.2547H162.294C160.334 34.8614 160.334 54.4594 162.294 76.8424H137.435C136.919 63.0206 137.642 46.5171 134.135 46.5171C130.628 46.5171 131.453 63.5364 133.825 76.8424H110.204C113.092 60.2356 113.505 34.6551 111.752 18.2547H111.958Z" fill="#F05323"/>
  </svg>
);

const PinExtensionGraphic: React.FC = () => {
  return (
    <div className={styles.graphicContainer}>
      <div className={styles.browserBar}>
        <div className={styles.browserActions}>
          <span className={styles.browserDot}></span>
          <span className={styles.browserDot}></span>
          <span className={styles.browserDot}></span>
        </div>
        <div className={styles.urlBar}>
          <div className={styles.urlText}>
            <span>{/* empty url name for spacing*/}</span>
            <FaPuzzlePiece className={styles.puzzleIcon} />
          </div>
        </div>
        <div className={styles.browserContent}></div>
      </div>
      <div className={styles.extensionsPopup}>
        <div className={styles.extensionsHeader}>
          Extensions
        </div>
        <div className={styles.extensionItem}>
          <div className={styles.extensionIcon}>
            <C2NIcon />
          </div>
          <div className={styles.extensionInfo}>
            <span className={styles.extensionName}>Canvas to Notion</span>
            <FaThumbtack className={styles.pinIcon} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SyncCanvasGraphic: React.FC = () => {
  return (
    <div className={styles.graphicContainer}>
      <div className={styles.syncIllustration}>
        <div className={styles.canvasBox}>
          <div className={styles.boxHeader}>Canvas</div>
          <div className={styles.boxContent}>
            <div className={styles.assignmentLine}></div>
            <div className={styles.assignmentLine}></div>
          </div>
        </div>
        <div className={styles.syncArrows}>
          <div className={styles.arrow}>→</div>
        </div>
        <div className={styles.notionBox}>
          <div className={styles.boxHeader}>Notion</div>
          <div className={styles.boxContent}>
            <div className={styles.notionLine}></div>
            <div className={styles.notionLine}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotionGraphic: React.FC = () => {
  return (
    <div className={styles.notionGraphicContainer}>
      <div className={styles.connectionFlow}>
        <div className={styles.appWindow}>
          <div className={styles.appHeader}>
            <div className={styles.appTitle}>C2N App</div>
            <div className={styles.appDot}></div>
          </div>
          <div className={styles.appContent}>
            <div className={styles.appIcon}>
              <span>C2N</span>
            </div>
          </div>
        </div>
        
        <div className={styles.connectionLine}>
          <div className={styles.connectionDot}></div>
          <div className={styles.connectionDot}></div>
          <div className={styles.connectionDot}></div>
        </div>
        
        <div className={styles.notionWindow}>
          <div className={styles.notionHeader}>
            <div className={styles.notionLogo}>
              <SiNotion />
            </div>
            <div className={styles.notionTitle}>Notion</div>
          </div>
          <div className={styles.notionContent}>
            <div className={styles.notionPage}>
              <div className={styles.notionBlock}>
                <div className={styles.notionIcon}>
                  <FaBook />
                </div>
                <div className={styles.notionText}>Assignments</div>
              </div>
              <div className={styles.notionPermission}>
                <div className={styles.lockIcon}>
                  <FaLock />
                </div>
                <div className={styles.permissionText}>Allow Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for Notion authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const notionCode = urlParams.get('code');
    
    if (notionCode) {
      // Send the code to our backend
      const sendNotionCode = async () => {
        try {
          const response = await axios.post('http://localhost:3000/api/notion/token', {
            code: notionCode
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data) {
            setIsNotionConnected(true);
            // Clear the URL parameters after successful token exchange
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Error exchanging Notion code for token:', err);
          setError('Failed to connect to Notion. Please try again.');
        }
      };

      sendNotionCode();
    }

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
      setIsConnecting(true);
      // Open Notion OAuth in same tab
      window.open(
        'https://api.notion.com/v1/oauth/authorize?client_id=1e3d872b-594c-8008-9ec9-003741e22a0f&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fconnection-setup',
        '_self'
      );
    } catch (err) {
      setIsConnecting(false);
      setError('Failed to connect to Notion. Please try again.');
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
            </div>

            {/* Cards Container */}
            <div className={styles.cardsContainer}>
              {/* Step 1: Pin Extension Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 1: Pin Extension</h2>
                <div className={styles.imageContainer}>
                  <PinExtensionGraphic />
                </div>
                <p className={styles.helperText}>
                  Pin the Canvas to Notion extension to your browser for easy access
                </p>
                <p className={styles.note}>
                  {/* Find the Canvas to Notion extension and click the pin icon */}
                </p>
              </div>

              {/* Step 2: Notion Connection Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 2: Connect Notion</h2>
                <div className={styles.imageContainer}>
                  <NotionGraphic />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button 
                  className={`${styles.buttonRectangle} ${isNotionConnected ? styles.connected : ''} ${isConnecting ? styles.connecting : ''}`}
                  onClick={handleNotionConnect}
                  disabled={isNotionConnected || isConnecting}
                >
                  {isNotionConnected ? 'Connected to Notion ✓' : 
                   isConnecting ? <div className={styles.spinner}></div> : 'Connect to Notion'}
                </button>
                <p className={styles.helperText}>
                  Allow access to your target Notion page
                </p>
                <p className={styles.note}>
                  Note: You can change your settings later in the Settings page.
                </p>
              </div>

              {/* Step 3: Start Syncing Card */}
              <div className={styles.card}>
                <h2 className={styles.cardHeader}>Step 3: Start Syncing</h2>
                <div className={styles.imageContainer}>
                  <SyncCanvasGraphic />
                </div>
                <p className={styles.helperText}>
                  Open Canvas and click the extension icon to start syncing your assignments
                </p>
                <button 
                  className={styles.buttonRectangle}
                  onClick={() => navigate('/settings')}
                >
                  Go to Settings
                </button>
                <p className={styles.note}>
                  Configure your sync preferences in the settings
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ConnectionSetup; 