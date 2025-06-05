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
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import logo from '../assets/c2n-favicon.svg';
import { useNotionAuth } from '../hooks/useNotionAuth';
import { API_URL } from '../utils/constants';

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
    userInfo: notionUserInfo,
    notionConnection,
    isConnecting,
    error: notionError,
    setNotionConnection
  } = useNotionAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('http://localhost:3000/api/users/info', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUserInfo(response.data);
      } catch (error) {
        console.error('Error fetching user info:', error);
        setError('Failed to fetch user information');
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
      // Notify extension about logout
      const extensionId = localStorage.getItem('extensionId');
      if (extensionId) {
        try {
          await chrome.runtime.sendMessage(extensionId, { type: 'LOGOUT' });
        } catch (error) {
          console.error('Failed to notify extension about logout:', error);
        }
      }

      // Clear local storage and navigate
      localStorage.removeItem('authToken');
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
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      // Call the delete account endpoint
      await axios.post('http://localhost:3000/api/auth/delete-account', {
        idToken: authToken
      });

      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('extensionId'); // Also remove the extension ID

      // Notify extension about logout
      const extensionId = localStorage.getItem('extensionId');
      if (extensionId) {
        try {
          await chrome.runtime.sendMessage(extensionId, { type: 'LOGOUT' });
        } catch (error) {
          console.error('Failed to notify extension about account deletion:', error);
        }
      }

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
    window.location.href = 'https://api.notion.com/v1/oauth/authorize?client_id=1e3d872b-594c-8008-9ec9-003741e22a0f&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fsettings';
  };

  const handleRemoveConnection = async () => {
    if (!notionUserInfo?.email) {
      console.error('No user email found');
      return;
    }
    
    try {
      setIsButtonLoading(true);
      const response = await axios.get(`http://localhost:3000/api/notion/disconnect`, {
        params: { email: notionUserInfo.email },
        headers: {
          'Content-Type': 'application/json'
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

  if (isLoading) {
    return (
      <>
        <GradientBackgroundWrapper />
        <div className={styles.pageWrapper}>
          <div className={styles.container}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <GradientBackgroundWrapper />
        <div className={styles.pageWrapper}>
          <div className={styles.container}>
            <div className={styles.error}>{error}</div>
            <button onClick={() => navigate('/login')} className={styles.button}>
              Return to Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <header className={styles.header}>
          <img 
            src={logo} 
            alt="Canvas to Notion" 
            className={styles.logo} 
            onClick={() => navigate('/')}
          />
        </header>
        
        <main className={styles.container}>
          <h1 className={styles.sectionTitle}>Overview</h1>
          <div className={styles.divider} />
          
          {userInfo && (
            <div className={styles.profileSection}>
              <div className={styles.profileGroup}>
                <div className={styles.profilePic}>
                  {userInfo.photoURL ? (
                    <img 
                      src={userInfo.photoURL} 
                      alt={userInfo.displayName} 
                      className={styles.profileImage}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.textContent = userInfo.displayName[0].toUpperCase();
                      }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    userInfo.displayName[0].toUpperCase()
                  )}
                </div>
                <div className={styles.profileInfo}>
                  <p className={styles.userName}>{userInfo.displayName}</p>
                  <p className={styles.userEmail}>{userInfo.email}</p>
                </div>
              </div>
              <div className={styles.actionButtons}>
                <button className={styles.button} onClick={handleLogout}>
                  Sign out
                </button>
                <button 
                  className={`${styles.button} ${styles.deleteButton}`} 
                  onClick={handleDeleteAccount}
                  disabled={isButtonLoading}
                >
                  {isButtonLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
              {deleteError && (
                <div className={styles.errorContainer}>
                  <p className={styles.errorText}>{deleteError}</p>
                </div>
              )}
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
                  ? `Connected to Notion`
                  : 'Not connected to Notion'
                }
              </span>
            </div>
            
            {notionError && (
              <div className={styles.errorContainer}>
                <p className={styles.errorText}>{notionError}</p>
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
    </>
  );
};

export default Settings; 