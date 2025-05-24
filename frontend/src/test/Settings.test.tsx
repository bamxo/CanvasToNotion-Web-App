import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../components/Settings';
import * as useNotionAuthModule from '../hooks/useNotionAuth';
import axios from 'axios';

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
  value: localStorageMock
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

// Setup function to render the component
const renderSettings = () => {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  );
};

describe('Settings Component', () => {
  // Spy on useNotionAuth hook
  let useNotionAuthSpy: ReturnType<typeof vi.spyOn>;
  const mockSetNotionConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = ''; // Clear the body to avoid test interference
    
    // Default mock implementation for the hook
    useNotionAuthSpy = vi.spyOn(useNotionAuthModule, 'useNotionAuth');
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    // Set up localStorage with a mock auth token
    localStorage.setItem('authToken', 'mock-token');
    
    // Mock axios get to resolve successfully
    mockedAxios.get.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useNotionAuthSpy.mockRestore();
    localStorage.clear();
  });

  it('renders the settings page with user information', () => {
    renderSettings();
    
    // Check for section titles
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Manage Connections')).toBeInTheDocument();
    
    // Check for user information
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    // Check for profile picture with initials
    const profilePic = screen.getByText('T');
    expect(profilePic).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
  });

  it('renders user initials correctly when firstName is not available', () => {
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Check for profile picture with email initial
    const profilePic = screen.getByText('T');
    expect(profilePic).toBeInTheDocument();
    
    // Check that it displays "User" instead of firstName
    expect(screen.getByText('User')).toBeInTheDocument();
  });
  
  it('signs out when the sign out button is clicked', async () => {
    renderSettings();
    
    // Find and click the sign out button
    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      // Expect the authToken to be removed and navigation to login page
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
  
  it('calls handleDeleteAccount when delete account button is clicked', () => {
    // Set up a spy on console.log
    const consoleSpy = vi.spyOn(console, 'log');
    
    renderSettings();
    
    // Find and click the delete account button
    const deleteButton = screen.getByText('Delete Account');
    fireEvent.click(deleteButton);
    
    // Verify the delete account function was called
    expect(consoleSpy).toHaveBeenCalledWith('Delete account clicked');
    
    // Clean up
    consoleSpy.mockRestore();
  });
  
  it('displays Notion connection status correctly when not connected', () => {
    renderSettings();
    
    // Check connection status text
    expect(screen.getByText('Not connected to Notion')).toBeInTheDocument();
    
    // Check for "Add Connection" button when not connected
    expect(screen.getByText('Add Connection')).toBeInTheDocument();
    expect(screen.queryByText('Remove Connection')).not.toBeInTheDocument();
  });
  
  it('displays Notion connection status correctly when connected', () => {
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: 'notion@example.com', isConnected: true },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Check connection status text
    expect(screen.getByText('Connected to Notion')).toBeInTheDocument();
    
    // Check for "Change Connection" and "Remove Connection" buttons when connected
    expect(screen.getByText('Change Connection')).toBeInTheDocument();
    expect(screen.getByText('Remove Connection')).toBeInTheDocument();
  });
  
  it('shows a spinner when connecting to Notion', () => {
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: true,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Check that the button contains a spinner
    const connectionButton = screen.getByRole('button', { name: '' });
    expect(connectionButton).toHaveAttribute('disabled');
    const spinner = connectionButton.querySelector('[class*="spinner"]');
    expect(spinner).toBeInTheDocument();
  });
  
  it('redirects to Notion OAuth when Add Connection button is clicked', () => {
    renderSettings();
    
    // Find and click the Add Connection button
    const addConnectionButton = screen.getByText('Add Connection');
    fireEvent.click(addConnectionButton);
    
    // Verify that location.href is set to the Notion OAuth URL
    expect(window.location.href).toContain('https://api.notion.com/v1/oauth/authorize');
    expect(window.location.href).toContain('client_id=1e3d872b-594c-8008-9ec9-003741e22a0f');
  });
  
  it('calls setNotionConnection when Remove Connection button is clicked', async () => {
    // Mock connected state
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: 'notion@example.com', isConnected: true },
      isConnecting: false,
      error: '',
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    // Mock successful API response
    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true }
    });
    
    renderSettings();
    
    // Find and click the Remove Connection button
    const removeConnectionButton = screen.getByText('Remove Connection');
    fireEvent.click(removeConnectionButton);
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      // Verify that axios.get was called with correct parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/notion/disconnect',
        expect.objectContaining({
          params: { email: 'test@example.com' }
        })
      );
      
      // Verify that setNotionConnection was called with the correct arguments
      expect(mockSetNotionConnection).toHaveBeenCalledWith({
        email: '',
        isConnected: false
      });
    });
  });

  it('displays an error message when there is an error', () => {
    const errorMessage = 'Failed to connect to Notion';
    useNotionAuthSpy.mockReturnValue({
      userInfo: { email: 'test@example.com', firstName: 'Test' },
      notionConnection: { email: '', isConnected: false },
      isConnecting: false,
      error: errorMessage,
      isLoading: false,
      setNotionConnection: mockSetNotionConnection,
    });
    
    renderSettings();
    
    // Check for error message
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('navigates to homepage when logo is clicked', () => {
    renderSettings();
    
    // Find and click the logo
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo);
    
    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('opens homepage in new tab when logo is clicked with metaKey', () => {
    renderSettings();
    
    // Find and click the logo with metaKey pressed
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo, { metaKey: true });
    
    // Verify window.open was called
    expect(mockOpen).toHaveBeenCalledWith('/', '_blank');
  });

  it('opens homepage in new tab when logo is clicked with ctrlKey', () => {
    renderSettings();
    
    // Find and click the logo with ctrlKey pressed
    const logo = screen.getByAltText('Canvas to Notion');
    fireEvent.click(logo, { ctrlKey: true });
    
    // Verify window.open was called
    expect(mockOpen).toHaveBeenCalledWith('/', '_blank');
  });
}); 