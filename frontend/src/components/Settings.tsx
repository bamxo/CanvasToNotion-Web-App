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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import logo from '../assets/c2n-favicon.svg';
import { useNotionAuth } from '../hooks/useNotionAuth';

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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log('Delete account clicked');
  };

  const handleNotionConnection = () => {
    setIsButtonLoading(true);
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