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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import logo from '../assets/c2n-favicon.svg';
import { useNotionAuth } from '../hooks/useNotionAuth';
import axios from 'axios';
import { EXTENSION_ID, NOTION_REDIRECT_URI } from '../utils/constants';

interface UserInfo {
  displayName: string;
  email: string;
}

/**
 * Settings component to display user information and manage Notion connection
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const {
    userInfo: notionUserInfo,
    notionConnection,
    isConnecting,
    error,
    setNotionConnection
  } = useNotionAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
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
      } finally {
        
      }
    };

    fetchUserInfo();
  }, [navigate]);

  // Clear button loading state when connection process completes
  useEffect(() => {
    if (!isConnecting) {
      setIsButtonLoading(false);
    }
  }, [isConnecting]);

  // Clear button loading state when connection status changes
  useEffect(() => {
    setIsButtonLoading(false);
  }, [notionConnection.isConnected]);

  const handleLogout = async () => {
    try {
      // Notify extension about logout
      try {
        await window.chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'LOGOUT' }
        );
        console.log('Notified extension about logout');
      } catch (extError) {
        console.error('Failed to notify extension about logout:', extError);
        // Continue with logout even if extension notification fails
      }

      // Clear local storage and redirect
      localStorage.removeItem('authToken');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to clear storage and redirect even if there's an error
      localStorage.removeItem('authToken');
      navigate('/login');
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

      // Notify extension about logout
      try {
        await window.chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'LOGOUT' }
        );
      } catch (extError) {
        console.error('Failed to notify extension about logout:', extError);
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
    // The loading state will be cleared by the useEffect hooks when the OAuth process completes
    const notionClientId = '1e3d872b-594c-8008-9ec9-003741e22a0f';
    const encodedRedirectUri = encodeURIComponent(NOTION_REDIRECT_URI);
    window.location.href = `https://api.notion.com/v1/oauth/authorize?client_id=${notionClientId}&response_type=code&owner=user&redirect_uri=${encodedRedirectUri}`;
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
                {userInfo.displayName[0].toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <p className={styles.userName}>{userInfo.displayName || 'User'}</p>
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
};

export default Settings; 