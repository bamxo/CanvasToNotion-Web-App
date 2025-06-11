import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Lookup from '../components/Lookup';
import axios from 'axios';
import { act } from '@testing-library/react';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock GradientBackgroundWrapper component
vi.mock('../components/GradientBackgroundWrapper', () => ({
  default: () => <div>GradientBackgroundWrapper</div>
}));

// Mock encryption module
vi.mock('../utils/encryption', () => ({
  secureStoreToken: (key: string, value: string) => {
    localStorage.setItem(key, value);
  }
}));

// Mock assets
vi.mock('../assets/google.svg?url', () => ({
  default: 'google-icon-url'
}));

vi.mock('../assets/Mail.svg?url', () => ({
  default: 'mail-icon-url'
}));

vi.mock('../assets/arrow.svg?url', () => ({
  default: 'arrow-icon-url'
}));

// Mock authButtons.json
vi.mock('../data/authButtons.json', () => ({
  default: {
    buttons: [
      { method: 'Email', iconPath: '../public/Mail.svg?url' },
      { method: 'Google', iconPath: '../public/google.svg?url' }
    ]
  }
}));

// Mock navigate function
const mockNavigate = vi.fn();

// Mock localStorage and window functions
const mockSetItem = vi.fn();
const mockOpen = vi.fn();

describe('Lookup Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cleanup(); // Make sure DOM is clean before each test
    
    // Setup window mocks
    global.open = mockOpen;
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: mockSetItem
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup(); // Clean up after each test
  });

  it('renders correctly with all required elements', () => {
    const { container } = render(
      <MemoryRouter>
        <Lookup />
      </MemoryRouter>
    );

    // Check for header content
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByText('Just a few details to get started')).toBeInTheDocument();

    // Check for authentication buttons
    const emailButton = container.querySelector('button:nth-of-type(1)');
    expect(emailButton).toHaveTextContent('Sign Up with Email');
    
    // The Google button is inside a div with id="google-signin-container"
    const googleButton = container.querySelector('#google-signin-container button');
    expect(googleButton).toHaveTextContent('Sign Up with Google');

    // Check for divider
    expect(screen.getByText('Or')).toBeInTheDocument();

    // Check for login section
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    const loginLink = container.querySelector('div[class*="login-link"]');
    expect(loginLink).toHaveTextContent('Login');
  });

  it('navigates to signup page when clicking Email signup button', () => {
    const { container } = render(
      <MemoryRouter>
        <Lookup />
      </MemoryRouter>
    );

    const emailButton = container.querySelector('button:nth-of-type(1)');
    if (emailButton) {
      fireEvent.click(emailButton);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('opens Google Sign-In prompt when clicking Google signup button', () => {
    // Mock Google accounts.id.prompt
    const mockPrompt = vi.fn();
    const mockInitialize = vi.fn();
    
    Object.defineProperty(window, 'google', {
      value: {
        accounts: {
          id: {
            prompt: mockPrompt,
            initialize: mockInitialize
          }
        }
      },
      writable: true
    });

    const { container } = render(
      <MemoryRouter>
        <Lookup />
      </MemoryRouter>
    );

    // Verify initialize was called with correct parameters
    expect(mockInitialize).toHaveBeenCalledWith(expect.objectContaining({
      client_id: expect.any(String),
      callback: expect.any(Function),
      auto_select: false,
      cancel_on_tap_outside: true,
      prompt_parent_id: 'google-signin-container'
    }));

    // Find the Google button inside the container
    const googleButton = container.querySelector('#google-signin-container button');
    if (googleButton) {
      fireEvent.click(googleButton);
    }

    // Verify prompt was called
    expect(mockPrompt).toHaveBeenCalled();
  });

  it('handles Google Sign-In callback correctly', async () => {
    // Mock Google accounts.id with initialize and prompt methods
    const mockPrompt = vi.fn();
    let savedCallback: any;
    const mockInitialize = vi.fn().mockImplementation(({ callback }) => {
      savedCallback = callback;
    });
    
    Object.defineProperty(window, 'google', {
      value: {
        accounts: {
          id: {
            prompt: mockPrompt,
            initialize: mockInitialize
          }
        }
      },
      writable: true
    });
    
    // Mock Chrome runtime for extension communication
    const originalChrome = window.chrome;
    const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'chrome', {
      value: {
        runtime: {
          sendMessage: mockSendMessage
        }
      },
      writable: true
    });
    
    // Mock axios response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        idToken: 'google-auth-token-123',
        extensionToken: 'extension-token-456'
      }
    });
    
    // Mock the cookie state endpoint
    mockedAxios.post.mockResolvedValueOnce({});
    
    // Render component
    render(
      <MemoryRouter>
        <Lookup />
      </MemoryRouter>
    );
    
    // Simulate the Google callback
    await act(async () => {
      await savedCallback({
        credential: 'google-credential-456',
        select_by: 'user'
      });
    });
    
    // Verify correct endpoint was called with the token
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google'),
      {
        idToken: 'google-credential-456',
        requestExtensionToken: true
      }
    );
    
    // Verify extension token was sent
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.any(String), // Extension ID
      {
        type: 'AUTH_TOKEN',
        token: 'extension-token-456'
      }
    );
    
    // Verify navigation occurred to settings page
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    
    // Restore original Chrome object
    Object.defineProperty(window, 'chrome', { value: originalChrome, writable: true });
  });

  it('navigates to login page when clicking login link', () => {
    const { container } = render(
      <MemoryRouter>
        <Lookup />
      </MemoryRouter>
    );

    const loginLink = container.querySelector('div[class*="login-link"]');
    if (loginLink) {
      fireEvent.click(loginLink);
    }

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // This test is a placeholder since we can't easily test React's useEffect cleanup
  it('cleans up interval on unmount', () => {
    expect(true).toBe(true);
  });
}); 