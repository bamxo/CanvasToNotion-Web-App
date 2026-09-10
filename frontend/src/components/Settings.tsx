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

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Settings.module.css';
import logo from '../assets/c2n-favicon.svg';
import { useNotionAuth } from '../hooks/useNotionAuth';
import { useEntitlements } from '../hooks/useEntitlements';
import LegacyPlanCard from './LegacyPlanCard';
import FreePlanCard from './FreePlanCard';
import { AUTH_ENDPOINTS, USER_ENDPOINTS, NOTION_ENDPOINTS, COOKIE_STATE_ENDPOINTS, BILLING_ENDPOINTS, IS_CROSS_ORIGIN_BACKEND } from '../utils/api';
import { EXTENSION_ID, NOTION_REDIRECT_URI } from '../utils/constants';
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

  const { tier, plan, memberSince, classSyncUsed, classSyncLimit, notionConnected, refetch } = useEntitlements();
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [refundDone, setRefundDone] = useState(false);

  const fmtDate = (epochSeconds?: number) =>
    epochSeconds ? new Date(epochSeconds * 1000).toLocaleDateString() : '';

  useEffect(() => {
    // Spec §6.4: refetch entitlements whenever the tab regains focus so a plan
    // change made in the Stripe portal shows up without a manual reload.
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (checkout === 'success' || checkout === 'cancelled') {
      if (checkout === 'success') {
        setPlanNotice('Payment received — your plan will update shortly.');
        timer = setTimeout(refetch, 2000);
      } else {
        setPlanNotice('Checkout cancelled.');
      }
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      if (timer) clearTimeout(timer);
    };
  }, [refetch]);

  // Keep the Plan section (class-sync usage bar) in sync with Notion
  // connect/disconnect done on this same page. useEntitlements fetches once on
  // mount and can win the race against the /notion/token exchange, so re-fetch
  // whenever the Notion connection status flips. Skip the initial mount — the
  // hook already fetches then.
  const didConnMount = useRef(false);
  useEffect(() => {
    if (!didConnMount.current) {
      didConnMount.current = true;
      return;
    }
    refetch();
  }, [notionConnection.isConnected, refetch]);

  const openPortal = async () => {
    setPlanBusy(true);
    setPlanError(null);
    try {
      const token = secureGetToken('authToken');
      const res = await axios.post(BILLING_ENDPOINTS.PORTAL, {}, { headers: { Authorization: `Bearer ${token}` } });
      window.location.href = res.data.url;
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPlanBusy(false);
    }
  };

  const requestRefund = async () => {
    setPlanBusy(true);
    setPlanError(null);
    try {
      const token = secureGetToken('authToken');
      await axios.post(BILLING_ENDPOINTS.REFUND, {}, { headers: { Authorization: `Bearer ${token}` } });
      setRefundDone(true);
      refetch();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPlanBusy(false);
    }
  };

  const withinRefundWindow =
    tier === 'lifetime' &&
    !!plan?.lifetimeRefundEligibleUntil &&
    plan.lifetimeRefundEligibleUntil * 1000 > Date.now();

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = secureGetToken('authToken');
      const isAuthenticatedCookie = Cookies.get('isAuthenticated');
      
      // In development mode, only check for token. In production, check for both
      // token and cookie — unless the backend is on a different site than this
      // page (dev:vercel), where the isAuthenticated cookie isn't readable here.
      const requireCookie = import.meta.env.PROD && !IS_CROSS_ORIGIN_BACKEND;
      const isAuthenticated = requireCookie
        ? (token && isAuthenticatedCookie)
        : token;
      
      if (!isAuthenticated) {
        console.log('Authentication check failed, redirecting to login');
        console.log('Token exists:', !!token);
        console.log('Cookie exists:', !!isAuthenticatedCookie);
        console.log('Is production:', import.meta.env.PROD);
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
        
        // Send the Firebase ID token the backend can verify (not a custom token)
        try {
          const extensionId = EXTENSION_ID;
          localStorage.setItem('extensionId', extensionId);
          await chrome.runtime.sendMessage(
            extensionId,
            {
              type: 'AUTH_TOKEN',
              token
            }
          );
          console.log('Successfully sent ID token to extension');
        } catch (extError) {
          console.error('Failed to send token to extension:', extError);
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
      
      // Also clear the isAuthenticated cookie only in production
      if (import.meta.env.PROD) {
        await axios.post(COOKIE_STATE_ENDPOINTS.CLEAR_AUTHENTICATED, {}, { withCredentials: true });
      }
      
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
      
      // Also clear the isAuthenticated cookie only in production
      if (import.meta.env.PROD) {
        await axios.post(COOKIE_STATE_ENDPOINTS.CLEAR_AUTHENTICATED, {}, { withCredentials: true });
      }

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

        <div className={styles['spacer-md']} />

        <section className={styles.planSection}>
          <h2 className={styles.sectionTitle}>Plan</h2>
          <div className={styles.divider} />
          {planNotice && <p className={styles.planNotice}>{planNotice}</p>}
          {planError && <p className={styles.planError} role="alert">{planError}</p>}

          {tier === 'free' && (
            <FreePlanCard classSyncUsed={classSyncUsed} classSyncLimit={classSyncLimit} notionConnected={notionConnected} />
          )}

          {tier === 'pro' && (
            <>
              <p>Pro — $1/month{plan?.cancelAtPeriodEnd ? ' (cancels at period end)' : ''}.</p>
              {plan?.currentPeriodEnd && (
                <p>{plan.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {fmtDate(plan.currentPeriodEnd)}</p>
              )}
              <button className={styles.button} onClick={openPortal} disabled={planBusy}>Manage subscription</button>
            </>
          )}

          {tier === 'lifetime' && withinRefundWindow && !refundDone && (
            <>
              <p>Lifetime — active. You're within your 7-day refund window (until {fmtDate(plan?.lifetimeRefundEligibleUntil)}).</p>
              <button className={styles.button} onClick={requestRefund} disabled={planBusy}>Request a refund</button>
            </>
          )}
          {tier === 'lifetime' && refundDone && <p>Refunded — your account is now Free.</p>}
          {tier === 'lifetime' && !withinRefundWindow && !refundDone && (
            <p>Lifetime — you're all set. Thanks!</p>
          )}

          {tier === 'legacy' && <LegacyPlanCard memberSince={memberSince} />}
        </section>

        <div className={styles['spacer-md']} />

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