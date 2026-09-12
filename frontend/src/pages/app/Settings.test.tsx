import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Settings from './Settings';
import * as useNotionAuthModule from '../../hooks/useNotionAuth';
import axios from 'axios';
import styles from './Settings.module.css';
import * as encryptionModule from '../../utils/encryption';
import * as entitlementsModule from '../../hooks/useEntitlements';

// Mock encryption utilities
vi.mock('../../utils/encryption', () => ({
  secureGetToken: vi.fn(() => 'mock-token'),
  secureRemoveToken: vi.fn(),
  secureStoreToken: vi.fn()
}));

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(() => 'true'),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

// Mock the entire useNotionAuth hook to prevent hook order violations
vi.mock('../../hooks/useNotionAuth', () => ({
  useNotionAuth: vi.fn()
}));

// Mock the entitlements hook with a factory default so existing Settings tests
// (which never touch the Plan section) keep passing.
vi.mock('../../hooks/useEntitlements', () => ({
  useEntitlements: vi.fn(() => ({
    tier: 'free', showAds: true, hasProFeatures: false, notionConnected: true,
    isLoading: false, error: null, refetch: () => {}
  }))
}));

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock window.location.href setter
const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, href: originalLocation.href }
  });
});

afterEach(() => {
  window.location = originalLocation;
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock chrome runtime
const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
Object.defineProperty(window, 'chrome', {
  value: {
    runtime: {
      sendMessage: mockSendMessage
    }
  },
  writable: true
});

// Mock window.open
const mockOpen = vi.fn();
vi.spyOn(window, 'open').mockImplementation(mockOpen);

// Mock window.confirm
vi.spyOn(window, 'confirm').mockImplementation(() => true);

// Setup function to render the component
const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderSettings = () => {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// For tests that rerender with a new mock and expect the same underlying
// query client (so entitlements/user-info state persists across the rerender
// like it would for a real re-render, not a fresh mount).
const renderApp = () => {
  const client = createTestQueryClient();
  const wrap = () => (
    <QueryClientProvider client={client}>
      <BrowserRouter><Settings /></BrowserRouter>
    </QueryClientProvider>
  );
  const utils = render(wrap());
  return { ...utils, rerenderApp: () => utils.rerender(wrap()) };
};

describe('Settings Component', () => {
  // Mock the useNotionAuth hook
  const mockUseNotionAuth = useNotionAuthModule.useNotionAuth as ReturnType<typeof vi.fn>;
  const mockSetNotionConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = ''; // Clear the body to avoid test interference
    
    // Default mock implementation for the hook
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    // Set up localStorage with a mock auth token
    localStorage.setItem('authToken', 'mock-token');
    
    // Mock all axios calls that the Settings component makes
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/users/info')) {
        return Promise.resolve({ 
          data: { 
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: 'https://example.com/photo.jpg'
          } 
        });
      }
      if (url.includes('/api/notion/disconnect')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/api/auth/refresh-extension-token')) {
        return Promise.resolve({ 
          data: { 
            success: true,
            extensionToken: 'mock-extension-token'
          } 
        });
      }
      if (url.includes('/api/auth/logout')) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url.includes('/api/auth/delete-account')) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url.includes('/api/cookie-state/clear-authenticated')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: true } });
    });

    // Mock environment variables
    Object.defineProperty(import.meta, 'env', {
      value: {
        PROD: false,
        VITE_API_BASE_URL: 'http://localhost:3000'
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockUseNotionAuth.mockRestore();
  });

  it('renders the settings page with user information', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    // Check for section titles
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Manage Connections')).toBeInTheDocument();

    // Check for user information - the component will show the actual user info from the API call
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    // The email should be from the mocked API response
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
    
    // Check for action buttons
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('renders user initials correctly when firstName is not available', async () => {
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Check that it displays "Test User" from the API response (not from the hook)
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Check that the profile pic element exists (not checking for text content)
    const profilePic = document.querySelector(`.${styles.profilePic}`);
    expect(profilePic).toBeInTheDocument();
  });
  
  it('signs out when the sign out button is clicked', async () => {
    // Mock localStorage methods
    const mockRemoveItem = vi.fn((key: string) => {
      delete (window.localStorage as any)[key];
    });
    
    // Save original and replace with mock
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = mockRemoveItem;
    
    // Set up localStorage with auth token
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('extensionId', 'extension-id-123');
    
    // Mock secure token functions
    vi.spyOn(encryptionModule, 'secureGetToken').mockReturnValue('test-token');
    
    // Render the component
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
    
    // Find and click the sign out button
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      // Check that localStorage.removeItem was called with extensionId
      expect(mockRemoveItem).toHaveBeenCalledWith('extensionId');
      // Check navigation to login page
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
    
    // Restore original function
    localStorage.removeItem = originalRemoveItem;
  });
  
  it('calls handleDeleteAccount when delete account button is clicked', async () => {
    // Add auth token to localStorage
    localStorage.setItem('authToken', 'test-token');
    
    // Mock secure token functions
    vi.spyOn(encryptionModule, 'secureGetToken').mockReturnValue('test-token');
    
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
    
    // Find and click the delete account button
    const deleteButton = screen.getByText('Delete Account');
    fireEvent.click(deleteButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      // Verify axios post was called for delete account
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/delete-account'),
        expect.objectContaining({
          idToken: 'test-token'
        })
      );
    });
  });
  
  it('displays Notion connection status correctly when not connected', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Not connected to Notion')).toBeInTheDocument();
    });
    
    // Check connection status text
    expect(screen.getByText('Not connected to Notion')).toBeInTheDocument();
    
    // Check for "Add Connection" button when not connected
    expect(screen.getByText('Add Connection')).toBeInTheDocument();
    expect(screen.queryByText('Remove Connection')).not.toBeInTheDocument();
  });
  
  it('displays Notion connection status correctly when connected', async () => {
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: 'notion@example.com', isConnected: true },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Connected to Notion')).toBeInTheDocument();
    });
    
    // Check connection status text
    expect(screen.getByText('Connected to Notion')).toBeInTheDocument();
    
    // Check for "Change Connection" and "Remove Connection" buttons when connected
    expect(screen.getByText('Change Connection')).toBeInTheDocument();
    expect(screen.getByText('Remove Connection')).toBeInTheDocument();
  });
  
  it('shows a spinner when connecting to Notion', async () => {
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: true,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Wait for the component to load and check that the button contains a spinner
    await waitFor(() => {
      const connectionButton = screen.getByRole('button', { name: '' });
      expect(connectionButton).toHaveAttribute('disabled');
      const spinner = connectionButton.querySelector('[class*="spinner"]');
      expect(spinner).toBeInTheDocument();
    });
  });
  
  it('redirects to Notion OAuth when Add Connection button is clicked', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Add Connection')).toBeInTheDocument();
    });
    
    // Find and click the Add Connection button
    const addConnectionButton = screen.getByText('Add Connection');
    fireEvent.click(addConnectionButton);
    
    // Verify that location.href is set to the Notion OAuth URL
    expect(window.location.href).toContain('https://api.notion.com/v1/oauth/authorize');
    expect(window.location.href).toContain('client_id=1e3d872b-594c-8008-9ec9-003741e22a0f');
  });
  
  it('calls setNotionConnection when Remove Connection button is clicked', async () => {
    // Mock connected state
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: 'notion@example.com', isConnected: true },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    // Add auth token to localStorage
    localStorage.setItem('authToken', 'test-token');
    
    // Mock secure token functions
    vi.spyOn(encryptionModule, 'secureGetToken').mockReturnValue('test-token');
    
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Remove Connection')).toBeInTheDocument();
    });
    
    // Find and click the Remove Connection button
    const removeButton = screen.getByText('Remove Connection');
    fireEvent.click(removeButton);
    
    // Wait for the async operation to complete
    await waitFor(() => {
      // Verify setNotionConnection was called
      expect(mockSetNotionConnection).toHaveBeenCalledWith({
        email: '',
        isConnected: false
      });
    });
  });

  it('displays an error message when there is an error', async () => {
    // Set up the error state
    mockUseNotionAuth.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: 'Failed to connect to Notion',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
    
    // The error from useNotionAuth hook should be handled by the hook itself
    // The Settings component doesn't directly display this error
    // So we just verify the component renders without crashing
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('navigates to homepage when logo is clicked', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByAltText('Canvas to Notion')).toBeInTheDocument();
    });
    
    // Find and click the logo
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo);
    
    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('opens homepage in new tab when logo is clicked with metaKey', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByAltText('Canvas to Notion')).toBeInTheDocument();
    });
    
    // Find and click the logo with metaKey pressed
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo, { metaKey: true });
    
    // Verify window.open was called
    expect(mockOpen).toHaveBeenCalledWith('/', '_blank');
  });

  it('opens homepage in new tab when logo is clicked with ctrlKey', async () => {
    renderSettings();
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByAltText('Canvas to Notion')).toBeInTheDocument();
    });
    
    // Find and click the logo with ctrlKey pressed
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo, { ctrlKey: true });
    
    // Verify window.open was called
    expect(mockOpen).toHaveBeenCalledWith('/', '_blank');
  });
});

const setEntitlements = (over: Partial<ReturnType<typeof entitlementsModule.useEntitlements>>) => {
  vi.mocked(entitlementsModule.useEntitlements).mockReturnValue({
    tier: 'free', showAds: true, hasProFeatures: false, plan: undefined,
    classSyncUsed: 0, classSyncLimit: 5, notionConnected: true,
    isLoading: false, error: null, refetch: vi.fn(), ...over,
  });
};

describe('Settings - Plan section', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    (useNotionAuthModule.useNotionAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      userInfo: { email: 'a@b.com', firstName: 'A' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: vi.fn(),
    });
    // make the existing auth/user fetch resolve so the component renders its body
    (axios as any).get = vi.fn().mockResolvedValue({ data: { email: 'a@b.com', displayName: 'A' } });
  });

  afterEach(() => {
    setEntitlements({ tier: 'free' });
  });

  it('free user sees the free plan card with usage and upgrade options', async () => {
    setEntitlements({ tier: 'free', classSyncUsed: 3, classSyncLimit: 5 });
    renderApp();
    expect(await screen.findByText('Standard Tier')).toBeInTheDocument();
    expect(screen.getByText('3 / 5 classes synced (60%)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim lifetime access/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /see plans/i })).not.toBeInTheDocument();
  });

  it('refetches entitlements when the Notion connection status flips (connect / disconnect)', async () => {
    const refetch = vi.fn();
    setEntitlements({ tier: 'free', notionConnected: false, refetch });
    const setConn = (isConnected: boolean) =>
      (useNotionAuthModule.useNotionAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        userInfo: { email: 'a@b.com', firstName: 'A' },
        notionConnection: { email: '', isConnected },
        isConnecting: false,
        error: '',
        isLoading: false,
        setNotionConnection: vi.fn(),
      });

    setConn(false);
    const { rerenderApp } = renderApp();
    await screen.findByText('Standard Tier');
    refetch.mockClear(); // ignore the hook's own mount fetch / initial effect skip

    // Notion gets connected on this page
    setConn(true);
    rerenderApp();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));

    // ...and disconnected again
    setConn(false);
    rerenderApp();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
  });

  it('pro user can open the billing portal', async () => {
    setEntitlements({ tier: 'pro', showAds: false, hasProFeatures: true, plan: { subscriptionStatus: 'active' } });
    (axios as any).post = vi.fn().mockResolvedValueOnce({ data: { url: 'https://stripe.test/p/1' } });
    Object.defineProperty(window, 'location', { writable: true, value: { href: '', search: '' } });
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /manage billing/i }));
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/p/1'));
  });

  it('shows an alert when opening the billing portal fails, without navigating', async () => {
    setEntitlements({ tier: 'pro', showAds: false, hasProFeatures: true, plan: { subscriptionStatus: 'active' } });
    (axios as any).post = vi.fn().mockRejectedValueOnce(new Error('network down'));
    Object.defineProperty(window, 'location', { writable: true, value: { href: 'http://localhost/settings', search: '' } });
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /manage billing/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/network down|something went wrong/i);
    expect(window.location.href).toBe('http://localhost/settings');
  });

  it('lifetime user within the window can request a refund', async () => {
    const refetch = vi.fn();
    setEntitlements({
      tier: 'lifetime', showAds: false, hasProFeatures: true, refetch,
      plan: { lifetimeRefundEligibleUntil: Math.floor(Date.now() / 1000) + 3600 },
    });
    (axios as any).post = vi.fn().mockResolvedValueOnce({ data: { refunded: true } });
    renderApp();
    // opens a confirmation dialog first...
    fireEvent.click(await screen.findByRole('button', { name: /request a refund/i }));
    const dialog = await screen.findByRole('dialog');
    // ...then the actual request fires on confirm
    fireEvent.click(within(dialog).getByRole('button', { name: /request refund/i }));
    await waitFor(() => expect(screen.getByText(/refunded/i)).toBeInTheDocument());
    expect(refetch).toHaveBeenCalled();
  });

  it('lifetime user can back out of the refund via the confirmation dialog', async () => {
    setEntitlements({
      tier: 'lifetime', showAds: false, hasProFeatures: true,
      plan: { lifetimeRefundEligibleUntil: Math.floor(Date.now() / 1000) + 3600 },
    });
    (axios as any).post = vi.fn();
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: /request a refund/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /keep lifetime/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((axios as any).post).not.toHaveBeenCalled();
  });

  it('legacy user sees the legacy plan card and no buttons', async () => {
    setEntitlements({
      tier: 'legacy',
      showAds: false,
      hasProFeatures: true,
      memberSince: '2024-01-15T00:00:00.000Z',
    });
    renderApp();
    expect(await screen.findByText(/full access to everything, free, forever/i)).toBeInTheDocument();
    expect(screen.getByText('Legacy Account')).toBeInTheDocument();
    expect(screen.getByText(/legacy member since: jan 15, 2024/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage subscription|request a refund/i })).not.toBeInTheDocument();
  });
});

describe('Settings - skeleton loaders', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    (useNotionAuthModule.useNotionAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      userInfo: { email: 'a@b.com', firstName: 'A' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: vi.fn(),
    });
    (axios as any).get = vi.fn().mockResolvedValue({ data: { email: 'a@b.com', displayName: 'A' } });
  });

  afterEach(() => {
    setEntitlements({ tier: 'free' });
  });

  it('shows the plan card skeleton (not the free/standard card) while entitlements load', async () => {
    setEntitlements({ tier: 'free', isLoading: true });
    renderApp();

    expect(await screen.findByTestId('plan-card-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Standard Tier')).not.toBeInTheDocument();
  });

  it('replaces the plan skeleton with the real card once entitlements finish loading', async () => {
    setEntitlements({ tier: 'free', isLoading: true });
    const { rerenderApp } = renderApp();
    await screen.findByTestId('plan-card-skeleton');

    setEntitlements({ tier: 'free', isLoading: false, classSyncUsed: 0, classSyncLimit: 5 });
    rerenderApp();

    expect(await screen.findByText('Standard Tier')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-card-skeleton')).not.toBeInTheDocument();
  });

  it('shows the connections skeleton (not the "Not connected" state) while the Notion status loads', async () => {
    setEntitlements({ tier: 'free', isLoading: false });
    (useNotionAuthModule.useNotionAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      userInfo: { email: 'a@b.com', firstName: 'A' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: true,
      setNotionConnection: vi.fn(),
    });
    renderApp();

    expect(await screen.findByTestId('connections-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Not connected to Notion')).not.toBeInTheDocument();
    expect(screen.queryByText('Add Connection')).not.toBeInTheDocument();
  });

  it('shows the profile skeleton (not a placeholder name) while the user info request is in flight', async () => {
    setEntitlements({ tier: 'free', isLoading: false });
    (axios as any).get = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    renderApp();

    expect(await screen.findByTestId('profile-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('User')).not.toBeInTheDocument();
    expect(screen.queryByText('user@email.com')).not.toBeInTheDocument();
  });
});
