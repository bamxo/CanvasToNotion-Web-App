import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AUTH_ENDPOINTS, NOTION_ENDPOINTS, USE_CREDENTIALS } from '../utils/api';
import { secureGetToken } from '../utils/encryption';

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

  // Prevent double-processing of the code
  const codeProcessedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const authToken = secureGetToken('authToken');
    
    if (!authToken) {
      navigate('/login');
      return;
    }

    // Extract and clear the Notion code from the URL immediately
    const urlParams = new URLSearchParams(window.location.search);
    const notionCode = urlParams.get('code');
    if (notionCode) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleNotionCode = async (code: string) => {
      if (!code || codeProcessedRef.current || !mountedRef.current) return;
      
      codeProcessedRef.current = true;
      setIsConnecting(true);
      setError(''); // Clear any previous errors
      
      try {
        const response = await axios.post(NOTION_ENDPOINTS.TOKEN, {
          code
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          withCredentials: USE_CREDENTIALS
        });

        if (!mountedRef.current) return;

        if (response.data.success) {
          setNotionConnection({
            email: response.data.workspaceId || userInfo?.email || '',
            isConnected: true
          });
        } else {
          setNotionConnection({
            email: '',
            isConnected: false
          });
          setError(response.data.error || 'Failed to connect to Notion.');
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        
        console.error('Error exchanging Notion code for token:', err);
        setNotionConnection({
          email: '',
          isConnected: false
        });
        
        const errorMessage = err?.response?.data?.error?.error_description ||
                           err?.response?.data?.error ||
                           err?.response?.data?.message ||
                           err?.message ||
                           'Failed to connect to Notion. Please try again.';
        setError(errorMessage);
      } finally {
        if (mountedRef.current) {
          setIsConnecting(false);
        }
      }
    };

    const checkNotionConnection = async () => {
      if (!mountedRef.current) return;
      
      try {
        const response = await axios.get(NOTION_ENDPOINTS.CONNECTED, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          withCredentials: USE_CREDENTIALS
        });

        if (!mountedRef.current) return;

        if (response.data.success && response.data.connected) {
          setNotionConnection({
            email: userInfo?.email || '',
            isConnected: true
          });
        } else {
          setNotionConnection({
            email: '',
            isConnected: false
          });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('Error checking Notion connection status:', err);
        setNotionConnection({ 
          email: '', 
          isConnected: false 
        });
      }
    };

    const initializeUserInfo = async () => {
      // First try to get basic info from token
      const decodedToken = decodeJWT(authToken);
      let email = decodedToken?.email;

      if (email && mountedRef.current) {
        setUserInfo({ email });
        // Check connection status first if no code to process
        if (!notionCode) {
          await checkNotionConnection();
        }
        // Process Notion code if present
        if (notionCode && !codeProcessedRef.current) {
          await handleNotionCode(notionCode);
        }
      }

      // Then try to get full user info from API
      try {
        const response = await axios.get(AUTH_ENDPOINTS.USER, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          withCredentials: USE_CREDENTIALS
        });

        if (!mountedRef.current) return;

        if (response.data && response.data.email) {
          setUserInfo(response.data);
          
          // If we didn't get email from token, handle code processing and connection check
          if (!email) {
            if (notionCode && !codeProcessedRef.current) {
              await handleNotionCode(notionCode);
            } else {
              await checkNotionConnection();
            }
          }
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        
        // Only set error if we don't have any user info yet
        if (!userInfo?.email) {
          console.error('Error fetching user info:', err);
          const errorMessage = err?.response?.data?.message ||
                              err?.response?.statusText ||
                              err?.message ||
                              'Authentication Error';
          setError(errorMessage);
          navigate('/login');
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeUserInfo();

    return () => {
      mountedRef.current = false;
    };
  }, [navigate]);

  return {
    userInfo,
    notionConnection,
    isConnecting,
    error,
    isLoading,
    setNotionConnection
  };
}; 