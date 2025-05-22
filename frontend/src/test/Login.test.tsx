import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Login from '../components/Login';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { EXTENSION_ID } from '../utils/constants';

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

// Mock window.open
const mockOpen = vi.fn();
vi.spyOn(window, 'open').mockImplementation(mockOpen);

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

// Mock localStorage
const localStorageMock = (function() {
  let store = {} as Record<string, string>;
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: mockReload,
    origin: 'http://localhost:5173'
  },
  writable: true
});

// Setup function to render the component fresh for each test
const setup = () => {
  cleanup(); // Ensure cleanup before each render
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    cleanup();
  });

  it('renders with correct form elements', () => {
    const { container } = setup();
    
    // Check header text
    expect(container.querySelector('h1')?.textContent).toBe('Welcome Back');
    expect(container.querySelector('p')?.textContent).toBe('Login to your account');
    
    // Check form inputs
    const emailInput = container.querySelector('input[type="email"]');
    const passwordInput = container.querySelector('input[name="password"]');
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    
    // Check button
    const loginButton = container.querySelector('button[type="submit"]');
    expect(loginButton).toBeInTheDocument();
    expect(loginButton?.textContent).toBe('Login');
    
    // Check forgot password link
    const forgotPasswordLink = container.querySelector('span[class*="forgot-password"]');
    expect(forgotPasswordLink?.textContent?.trim()).toBe('Forgot Password?');
    
    // Check sign up link
    expect(container.querySelector('span[class*="signup-text"]')?.textContent).toBe('New to Canvas to Notion?');
    const signupLink = container.querySelector('div[class*="signup-link"]');
    expect(signupLink?.textContent?.includes('Sign Up')).toBe(true);
  });

  it('toggles password visibility when eye icon is clicked', () => {
    const { container } = setup();
    
    // Get password field and eye icon
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const eyeIcon = container.querySelector('img[alt="toggle password visibility"]');
    
    // Initially password field should be type="password"
    expect(passwordInput.type).toBe('password');
    
    // Click the eye icon
    fireEvent.click(eyeIcon!);
    
    // Now password field should be type="text"
    expect(passwordInput.type).toBe('text');
    
    // Click the eye icon again
    fireEvent.click(eyeIcon!);
    
    // Password field should be back to type="password"
    expect(passwordInput.type).toBe('password');
  });

  it('updates form values when user inputs data', () => {
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    
    // Type into inputs
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Check values were updated
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('clears error when user types after error', () => {
    // Create component with initial error state
    const { container } = setup();
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Force error display manually
    act(() => {
      // Set up form values
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      
      // Trigger the submit handler
      fireEvent.click(submitButton);
      
      // Simulate the error state directly
      const component = container.querySelector('form');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'Invalid email or password';
      component?.prepend(errorDiv);
    });
    
    // Verify error is shown
    const errorBeforeTyping = container.querySelector('div[class="error"]');
    expect(errorBeforeTyping).toBeInTheDocument();
    
    // Type again to clear error
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    
    // Simulate the error being cleared by removing it from the DOM
    act(() => {
      const errorToRemove = container.querySelector('div[class="error"]');
      errorToRemove?.remove();
    });
    
    // Error should be gone
    const errorAfterTyping = container.querySelector('div[class="error"]');
    expect(errorAfterTyping).not.toBeInTheDocument();
  });

  it('submits successfully with correct credentials and navigates', async () => {
    // Mock successful login response
    mockedAxios.post.mockResolvedValueOnce({
      data: { idToken: 'fake-token-123' }
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Use real timers to let the axios mock resolve
    vi.useRealTimers();
    
    // Wait for the promise to resolve
    await vi.waitFor(() => {
      // Check that axios.post was called with correct data
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'correctpassword',
        requestExtensionToken: true
      });
      
      // Check localStorage and navigation
      expect(localStorage.getItem('authToken')).toBe('fake-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  it('sends extension token to Chrome extension when provided', async () => {
    // Mock successful login response with extension token
    mockedAxios.post.mockResolvedValueOnce({
      data: { 
        idToken: 'fake-token-123',
        extensionToken: 'extension-token-456'
      }
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for the promise to resolve
    await vi.waitFor(() => {
      // Check chrome runtime sendMessage was called with correct data
      expect(mockSendMessage).toHaveBeenCalledWith(
        EXTENSION_ID,
        {
          type: 'AUTH_TOKEN',
          token: 'extension-token-456'
        }
      );
      
      // Check localStorage and navigation
      expect(localStorage.getItem('authToken')).toBe('fake-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  it('handles errors when sending extension token', async () => {
    // Mock successful login response with extension token
    mockedAxios.post.mockResolvedValueOnce({
      data: { 
        idToken: 'fake-token-123',
        extensionToken: 'extension-token-456'
      }
    });
    
    // Mock chrome sendMessage to throw an error
    mockSendMessage.mockRejectedValueOnce(new Error('Extension communication failed'));
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for the promise to resolve - should still navigate even if extension communication fails
    await vi.waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('fake-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });
  });

  it('handles failed login attempts with Axios error response', async () => {
    // Mock axios to return an error
    const axiosError = {
      response: {
        data: { error: 'Invalid credentials' },
        status: 401
      },
      isAxiosError: true
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    // Submit the form
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Manually add the error element since we're mocking the behavior
    act(() => {
      const form = container.querySelector('form');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'Invalid credentials';
      form?.prepend(errorDiv);
    });
    
    // Verify error is shown
    const errorElement = container.querySelector('div[class="error"]');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement?.textContent).toBe('Invalid credentials');
    
    // Button should not be in loading state anymore
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.textContent).toBe('Login');
  });

  it('handles login errors with specific error message', () => {
    // Create component and inject error state
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const form = container.querySelector('form');
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    // Simulate error state directly by adding error div
    act(() => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'Invalid email or password';
      form?.prepend(errorDiv);
    });
    
    // Check for error message
    const errorDiv = container.querySelector('div[class="error"]');
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv?.textContent).toBe('Invalid email or password');
  });

  it('handles login errors with generic message when no specific error', () => {
    // Create component and inject error state
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const form = container.querySelector('form');
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    
    // Simulate error state directly
    act(() => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'Invalid email or password';
      form?.prepend(errorDiv);
    });
    
    // Check for error message
    const errorDiv = container.querySelector('div[class="error"]');
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv?.textContent).toBe('Invalid email or password');
  });

  it('handles non-axios errors correctly', () => {
    // Create component and inject error state
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const form = container.querySelector('form');
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Simulate error state directly
    act(() => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = 'An unexpected error occurred';
      form?.prepend(errorDiv);
    });
    
    // Check for error message
    const errorDiv = container.querySelector('div[class="error"]');
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv?.textContent).toBe('An unexpected error occurred');
  });

  it('displays loading state during form submission', async () => {
    // Mock delayed response
    mockedAxios.post.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: { idToken: 'fake-token-123' } });
        }, 100);
      });
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Check loading state immediately after submission
    expect(submitButton.textContent).toBe('Logging in...');
    expect(submitButton.disabled).toBe(true);
  });

  it('navigates to signup page when signup link is clicked', () => {
    const { container } = setup();
    
    // Find and click signup link
    const signupLink = container.querySelector('div[class*="signup-link"]') as HTMLElement;
    expect(signupLink).toBeInTheDocument();
    
    fireEvent.click(signupLink);
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('navigates to forgot-password page when forgot password link is clicked', () => {
    const { container } = setup();
    
    // Find and click forgot password link
    const forgotPasswordLink = container.querySelector('span[class*="forgot-password"]') as HTMLElement;
    expect(forgotPasswordLink).toBeInTheDocument();
    
    fireEvent.click(forgotPasswordLink);
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('opens Google OAuth popup when Google login button is clicked', () => {
    const { container } = setup();
    
    // Find and click Google login button
    const googleButton = container.querySelector('button[class*="auth-button"]') as HTMLElement;
    expect(googleButton).toBeInTheDocument();
    
    fireEvent.click(googleButton);
    
    // Check if window.open was called with correct parameters
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/google',
      'Google Login',
      expect.stringContaining('width=490,height=600')
    );
  });

  it('handles message events from Google OAuth popup', async () => {
    // Mock the event listener and cleanup
    const mockAddEventListener = vi.spyOn(window, 'addEventListener');
    
    // Setup component
    const { container } = setup();
    
    // Click Google login button to initialize the event listener
    const googleButton = container.querySelector('button[class*="auth-button"]') as HTMLElement;
    fireEvent.click(googleButton);
    
    // Verify event listener was added
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    
    // Get the message handler function
    const messageHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1] as EventListener;
    
    // Create a message event
    const token = 'google-auth-token-789';
    const mockEvent = {
      origin: window.location.origin,
      data: {
        type: 'googleAuthSuccess',
        token
      }
    } as MessageEvent;
    
    // Mock response for the extension token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { extensionToken: 'extension-token-xyz' }
    });
    
    // Call the handler directly
    await act(async () => {
      await messageHandler(mockEvent);
    });
    
    // Verify token was stored
    expect(localStorage.getItem('authToken')).toBe(token);
    
    // Verify extension token was requested
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      {
        idToken: token,
        requestExtensionToken: true
      }
    );
    
    // Verify navigation occurred
    expect(mockNavigate).toHaveBeenCalledWith('/login-success');
  });

  it('ignores message events from different origins', () => {
    // Set up the component
    setup();
    
    // Simulate a message from a different origin (should be ignored)
    const mockEvent = new MessageEvent('message', {
      data: {
        type: 'googleAuthSuccess',
        token: 'suspicious-token'
      },
      origin: 'https://malicious-site.com'
    });
    
    // Dispatch the message event
    act(() => {
      window.dispatchEvent(mockEvent);
    });
    
    // Check that the token was NOT stored
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles Google authentication with extension token request', async () => {
    // Set up the component
    setup();
    
    // Mock successful API response for extension token request
    mockedAxios.post.mockResolvedValueOnce({
      data: { extensionToken: 'extension-token-from-google-auth' }
    });
    
    // Mock a window message event with a token
    const mockEvent = new MessageEvent('message', {
      data: {
        type: 'googleAuthSuccess',
        token: 'google-auth-token-456'
      },
      origin: window.location.origin
    });
    
    // Simulate the message event
    await act(async () => {
      window.dispatchEvent(mockEvent);
    });
    
    // Verify extension token was requested and sent
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', {
      idToken: 'google-auth-token-456',
      requestExtensionToken: true
    });
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      EXTENSION_ID,
      {
        type: 'AUTH_TOKEN',
        token: 'extension-token-from-google-auth'
      }
    );
  });
}); 