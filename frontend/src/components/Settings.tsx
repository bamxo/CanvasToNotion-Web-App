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
import { EXTENSION_ID } from '../utils/constants';

/**
 * Settings component to display user information and manage Notion connection
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const {
    userInfo,
    notionConnection,
    isConnecting,
    error,
    setNotionConnection
  } = useNotionAuth();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

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

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Delete account clicked');
  };

  const handleNotionConnection = () => {
    setIsButtonLoading(true);
    // The loading state will be cleared by the useEffect hooks when the OAuth process completes
    window.location.href = 'https://api.notion.com/v1/oauth/authorize?client_id=1e3d872b-594c-8008-9ec9-003741e22a0f&response_type=code&owner=user&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fsettings';
  };

  const handleRemoveConnection = async () => {
    if (!userInfo?.email) {
      console.error('No user email found');
      return;
    }
    
    try {
      setIsButtonLoading(true);
      const response = await axios.get(`http://localhost:3000/api/notion/disconnect`, {
        params: { email: userInfo.email },
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