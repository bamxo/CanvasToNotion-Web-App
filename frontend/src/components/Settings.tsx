/**
 * Settings Component
 * 
 * This component serves as the main settings page for the application where users can:
 * 1. View their account information
 * 2. Connect their Notion account
 * 3. Manage their authentication status
 * 4. Log out of the application
 * 
 * The component handles user authentication verification and provides
 * integration with Notion's OAuth flow for account connection.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Settings.module.css';
import logo from '../assets/c2n-favicon.svg';

interface UserInfo {
  email: string;
  firstName?: string;
}

interface NotionConnection {
  email: string;
  isConnected: boolean;
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
 * Settings component to display user information and manage Notion connection
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [notionConnection, setNotionConnection] = useState<NotionConnection>({
    email: '',
    isConnected: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Check for Notion authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const notionCode = urlParams.get('code');
    
    if (notionCode) {
      // Send the code to our backend
      const exchangeNotionToken = async () => {
        try {
          setIsConnecting(true);
          const response = await axios.post('http://localhost:3000/api/notion/token', {
            code: notionCode
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data.success) {
            setNotionConnection({
              email: response.data.workspaceId || 'Connected',
              isConnected: true
            });
            // Clear the URL parameters after successful token exchange
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Error exchanging Notion code for token:', err);
          setError('Failed to connect to Notion. Please try again.');
        } finally {
          setIsConnecting(false);
        }
      };

      exchangeNotionToken();
    }

    // Temporary: Decode token to display email for testing
    const decodedToken = decodeJWT(authToken);
    if (decodedToken && decodedToken.email) {
      setUserInfo({ email: decodedToken.email });
    }

    // Fetch user info
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
              console.error(`Server Error: ${err.response.data?.message || err.response.statusText}`);
            } else if (err.request) {
              console.error('No response received from server. Please check if the backend server is running.');
            } else {
              console.error(`Request Error: ${err.message}`);
            }
          } else {
            console.error('An unexpected error occurred');
          }
        }
        console.error('Error fetching user info:', err);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Delete account clicked');
  };

  const handleNotionConnection = () => {
    setIsConnecting(true);
    window.location.href = 'https://api.notion.com/v1/oauth/authorize?client_id=1e3d872b-594c-8008-9ec9-003741e22a0f&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fsettings';
  };

  const handleRemoveConnection = () => {
    // TODO: Implement connection removal logic
    setNotionConnection({
      email: '',
      isConnected: false
    });
  };

  const getInitials = (email: string, firstName?: string) => {
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Open in new tab
      window.open('/', '_blank');
    } else {
      // Normal navigation
      navigate('/');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <img 
          src={logo} 
          alt="Canvas to Notion" 
          className={styles.logo} 
          onClick={handleLogoClick}
        />
      </header>
      
      <main className={styles.container}>
        <h1 className={styles.sectionTitle}>Overview</h1>
        <div className={styles.divider} />
        
        {userInfo && (
          <div className={styles.profileSection}>
            <div className={styles.profileGroup}>
              <div className={styles.profilePic}>
                {getInitials(userInfo.email, userInfo.firstName)}
              </div>
              <div className={styles.profileInfo}>
                <p className={styles.userName}>{userInfo.firstName || 'User'}</p>
                <p className={styles.userEmail}>{userInfo.email}</p>
              </div>
            </div>
            <div className={styles.actionButtons}>
              <button className={styles.button} onClick={handleLogout}>
                Sign out
              </button>
              <button className={`${styles.button} ${styles.deleteButton}`} onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        )}

        <div className={styles['spacer-lg']} />

        <div className={styles.connectionsSection}>
          <h2 className={styles.sectionTitle}>Manage Connections</h2>
          <div className={styles.divider} />
          
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusIndicator} ${!notionConnection.isConnected && styles.disconnected}`} />
            <span className={styles.connectionEmail}>
              {notionConnection.isConnected 
                ? `Connected to ${notionConnection.email}`
                : 'Not connected to Notion'
              }
            </span>
          </div>
          
          {error && (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}
          
          <div className={styles.connectionButtons}>
            <button 
              className={styles.changeConnectionButton}
              onClick={handleNotionConnection}
              disabled={isConnecting}
            >
              {isConnecting ? <div className={styles.spinner}></div> : 
                notionConnection.isConnected ? 'Change Connection' : 'Add Connection'}
            </button>
            {notionConnection.isConnected && (
              <button 
                className={styles.removeConnectionButton}
                onClick={handleRemoveConnection}
              >
                Remove Connection
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings; 