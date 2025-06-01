import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserInfo {
  email: string;
  firstName?: string;
}

interface NotionConnection {
  email: string;
  isConnected: boolean;
}

interface UseNotionAuthReturn {
  userInfo: UserInfo | null;
  notionConnection: NotionConnection;
  isConnecting: boolean;
  error: string;
  isLoading: boolean;
  setNotionConnection: (connection: NotionConnection) => void;
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

export const useNotionAuth = (): UseNotionAuthReturn => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [notionConnection, setNotionConnection] = useState<NotionConnection>({
    email: '',
    isConnected: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Check for Notion authorization code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const notionCode = urlParams.get('code');
    
    const handleNotionCode = async (email: string) => {
      if (!notionCode) return;
      
      try {
        setIsConnecting(true);
        const response = await axios.post('http://localhost:3000/api/notion/token', {
          code: notionCode,
          email: email
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!isMounted) return;

        if (response.data.success) {
          setNotionConnection({
            email: response.data.workspaceId || 'Connected',
            isConnected: true
          });
        } else if (response.data) {
          setNotionConnection({
            email: '',
            isConnected: true
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error exchanging Notion code for token:', err);
        setError('Failed to connect to Notion. Please try again.');
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
      }

      // Clear the URL parameters after attempting token exchange
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    const checkNotionConnection = async (email: string) => {
      try {
        const response = await axios.get(`http://localhost:3000/api/notion/connected?email=${encodeURIComponent(email)}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!isMounted) return;

        if (response.data.success && response.data.connected) {
          setNotionConnection({
            email: email,
            isConnected: true
          });
        } else {
          setNotionConnection({
            email: '',
            isConnected: false
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error checking Notion connection status:', err);
        // Don't set error here, just log it as this is not critical
        setNotionConnection({
          email: '',
          isConnected: false
        });
      }
    };

    const initializeUserInfo = async () => {
      // First try to get basic info from token
      const decodedToken = decodeJWT(authToken);
      if (decodedToken && decodedToken.email && isMounted) {
        setUserInfo({ email: decodedToken.email });
        // Check Notion connection status
        await checkNotionConnection(decodedToken.email);
        // If we got user info from token, handle Notion code if present
        if (notionCode) {
          await handleNotionCode(decodedToken.email);
        }
      }

      // Then try to get full user info
      try {
        const response = await axios.get('http://localhost:5173/api/auth/user', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (!isMounted) return;

        if (response.data && response.data.email) {
          setUserInfo(response.data);
          // Check Notion connection if we haven't already
          if (!decodedToken || !decodedToken.email) {
            await checkNotionConnection(response.data.email);
          }
          // If we haven't handled Notion code yet and it's present, handle it now
          if (notionCode && (!decodedToken || !decodedToken.email)) {
            await handleNotionCode(response.data.email);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Only set error if we don't have any user info yet
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Run initialization
    initializeUserInfo();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]); // Only depend on navigate

  return {
    userInfo,
    notionConnection,
    isConnecting,
    error,
    isLoading,
    setNotionConnection
  };
}; 