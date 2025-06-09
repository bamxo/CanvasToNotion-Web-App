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
import { useNotionAuth } from '../hooks/useNotionAuth';
import { AUTH_ENDPOINTS, USER_ENDPOINTS, NOTION_ENDPOINTS, COOKIE_STATE_ENDPOINTS } from '../utils/api';
import { NOTION_REDIRECT_URI } from '../utils/constants';
import { secureGetToken, secureRemoveToken } from '../utils/encryption';
import Cookies from 'js-cookie';

interface UserInfo {
  displayName: string;
  email: string;
  photoURL?: string;
  photoUrl?: string;
  extensionId?: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const {
    notionConnection,
    isConnecting,
    setNotionConnection
  } = useNotionAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = secureGetToken('authToken');
      const isAuthenticatedCookie = Cookies.get('isAuthenticated');
      
      if (!token || !isAuthenticatedCookie) {
        console.log('No auth token or isAuthenticated cookie found, redirecting to login');
        secureRemoveToken('authToken');
        navigate('/login');
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(USER_ENDPOINTS.INFO, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUserInfo(response.data);
        
        // Refresh the extension token and send it to the extension
        try {
          const extensionResponse = await axios.post(
            AUTH_ENDPOINTS.REFRESH_EXTENSION_TOKEN, 
            {}, // No body needed, token is in the authorization header
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          if (extensionResponse.data && extensionResponse.data.extensionToken) {
            // Try to send the token to the extension
            const extensionId = localStorage.getItem('extensionId');
            if (extensionId) {
              try {
                await chrome.runtime.sendMessage(
                  extensionId,
                  {
                    type: 'AUTH_TOKEN',
                    token: extensionResponse.data.extensionToken
                  }
                );
                console.log('Successfully sent refreshed token to extension');
              } catch (extError) {
                console.error('Failed to send token to extension:', extError);
              }
            }
          }
        } catch (extError) {
          console.error('Failed to refresh extension token:', extError);
          // Non-fatal error, user can still use the web app
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Check if error is due to unauthorized access (expired token)
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Auth token expired or invalid, logging out user');
          secureRemoveToken('authToken');
          navigate('/login');
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  useEffect(() => {
    // Listen for messages from the extension
    const handleExtensionMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOGOUT') {
        console.log('Received logout message from extension');
        handleLogout();
      }
    };

    window.addEventListener('message', handleExtensionMessage);

    return () => {
      window.removeEventListener('message', handleExtensionMessage);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call the backend logout endpoint to clear the session cookie
      await axios.post(AUTH_ENDPOINTS.LOGOUT, {}, { withCredentials: true });
      
      // Also clear the isAuthenticated cookie
      await axios.post(COOKIE_STATE_ENDPOINTS.CLEAR_AUTHENTICATED, {}, { withCredentials: true });
      
      // Clear local storage and navigate
      secureRemoveToken('authToken');
      localStorage.removeItem('extensionId'); // Also remove the extension ID
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setIsButtonLoading(true);
      const authToken = secureGetToken('authToken');
      
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      // Call the delete account endpoint
      await axios.post(AUTH_ENDPOINTS.DELETE_ACCOUNT, {
        idToken: authToken
      });

      // Call the logout endpoint to clear the session cookie
      await axios.post(AUTH_ENDPOINTS.LOGOUT, {}, { withCredentials: true });
      
      // Also clear the isAuthenticated cookie
      await axios.post(COOKIE_STATE_ENDPOINTS.CLEAR_AUTHENTICATED, {}, { withCredentials: true });

      // Clear local storage
      secureRemoveToken('authToken');
      localStorage.removeItem('extensionId'); // Also remove the extension ID

      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const handleNotionConnection = () => {
    setIsButtonLoading(true);
    window.location.href = `https://api.notion.com/v1/oauth/authorize?client_id=1e3d872b-594c-8008-9ec9-003741e22a0f&response_type=code&owner=user&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}`;
  };

  const handleRemoveConnection = async () => {
    try {
      setIsButtonLoading(true);
      const authToken = secureGetToken('authToken');
      
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(NOTION_ENDPOINTS.DISCONNECT, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        // Update the notion connection state
        setNotionConnection({
          email: '',
          isConnected: false
        });
      } else {
        console.error('Failed to disconnect from Notion:', response.data.error);
      }
    } catch (error) {
      console.error('Error disconnecting from Notion:', error);
    } finally {
      setIsButtonLoading(false);
    }
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
        
        <div className={styles.profileSection}>
          {isLoading ? (
            <div className={styles.profileGroup}>
              <div className={styles.profilePic}></div>
              <div className={styles.profileInfo}>
                <p className={styles.userName}>User</p>
                <p className={styles.userEmail}>user@email.com</p>
              </div>
            </div>
          ) : (
            <div className={styles.profileGroup}>
              <div className={styles.profilePic}>
                {userInfo?.photoURL ? (
                  <img 
                    src={userInfo.photoURL} 
                    alt={userInfo?.displayName} 
                    className={styles.profileImage} 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.textContent = userInfo?.displayName?.[0].toUpperCase() || '?';
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  userInfo?.displayName?.[0].toUpperCase() || '?'
                )}
              </div>
              <div className={styles.profileInfo}>
                <p className={styles.userName}>{userInfo?.displayName || 'User'}</p>
                <p className={styles.userEmail}>{userInfo?.email || ''}</p>
              </div>
            </div>
          )}
          <div className={styles.actionButtons}>
            <button className={styles.button} onClick={handleLogout}>
              Sign out
            </button>
            <button className={`${styles.button} ${styles.deleteButton}`} onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>
          {deleteError && (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{deleteError}</p>
            </div>
          )}
        </div>

        <div className={styles['spacer-lg']} />

        <div className={styles.connectionsSection}>
          <h2 className={styles.sectionTitle}>Manage Connections</h2>
          <div className={styles.divider} />
          
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusIndicator} ${!notionConnection.isConnected && styles.disconnected}`} />
            <span className={styles.connectionEmail}>
              {notionConnection.isConnected 
                ? `Connected to Notion`
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
              disabled={isButtonLoading || isConnecting}
            >
              {(isButtonLoading || isConnecting) ? (
                <div className={styles.spinner} />
              ) : (
                notionConnection.isConnected ? 'Change Connection' : 'Add Connection'
              )}
            </button>
            {notionConnection.isConnected && (
              <button 
                className={styles.removeConnectionButton}
                onClick={handleRemoveConnection}
                disabled={isButtonLoading}
              >
                {isButtonLoading ? (
                  <div className={styles.spinner} />
                ) : (
                  'Remove Connection'
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings; 