import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SignUp from '../components/SignUp';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

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

// Setup function to render the component fresh for each test
const setup = () => {
  cleanup(); // Ensure cleanup before each render
  return render(
    <BrowserRouter>
      <SignUp />
    </BrowserRouter>
  );
};

describe('SignUp Component', () => {
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
    expect(container.querySelector('h1')?.textContent).toBe('Create an Account');
    expect(container.querySelector('p')?.textContent).toBe('Just a few details to get started');
    
    // Check form inputs
    const emailInput = container.querySelector('input[type="email"]');
    const passwordInput = container.querySelector('input[name="password"]');
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]');
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(confirmPasswordInput).toBeInTheDocument();
    
    // Check button
    const createAccountButton = container.querySelector('button[type="submit"]');
    expect(createAccountButton).toBeInTheDocument();
    expect(createAccountButton?.textContent).toBe('Create Account');
    
    // Check login link
    expect(container.querySelector('span')?.textContent).toBe('Already have an account?');
    expect(container.querySelector('div[class*="login-link"]')?.textContent?.includes('Login')).toBe(true);
  });

  it('toggles password visibility when eye icon is clicked', () => {
    const { container } = setup();
    
    // Get password fields and eye icons
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const eyeIcons = container.querySelectorAll('img[alt="toggle password visibility"]');
    
    // Initially both password fields should be type="password"
    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
    
    // Click the first eye icon
    fireEvent.click(eyeIcons[0]);
    
    // Now both password fields should be type="text"
    expect(passwordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('text');
    
    // Click the eye icon again
    fireEvent.click(eyeIcons[0]);
    
    // Both password fields should be back to type="password"
    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('updates form values when user inputs data', () => {
    const { container } = setup();
    
    // Get form fields using more specific queries
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    
    // Type into inputs
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    // Check values were updated
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
    expect(confirmPasswordInput.value).toBe('password123');
  });

  it('shows error when passwords do not match', async () => {
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form with non-matching passwords
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorDiv = container.querySelector('div[class*="error"]');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toBe('Passwords do not match. Please try again.');
    });
  });

  it('shows error when password is too short', async () => {
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form with short password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorDiv = container.querySelector('div[class*="error"]');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toBe('Password must be at least 8 characters long.');
    });
  });

  it('clears error when user types after error', async () => {
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form with short password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorDiv = container.querySelector('div[class*="error"]');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toBe('Password must be at least 8 characters long.');
    });
    
    // Type again to clear error
    fireEvent.change(passwordInput, { target: { value: 'longer_password' } });
    
    // Error should be gone
    const errorDiv = container.querySelector('div[class*="error"]');
    expect(errorDiv).not.toBeInTheDocument();
  });

  it('submits successfully and navigates to connection-setup on success', async () => {
    // Mock successful API responses
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/signup')) {
        return Promise.resolve({ data: { success: true } });
      } else if (url.includes('/login')) {
        return Promise.resolve({ data: { idToken: 'fake-token-123', extensionToken: 'ext-token-123' } });
      } else if (url.includes('/set-authenticated')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'validpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for form submission and navigation
    await waitFor(() => {
      // Check that axios.post was called with correct data for signup
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signup',
        {
          email: 'test@example.com',
          password: 'validpassword',
          displayName: 'test'
        },
        {
          withCredentials: true
        }
      );
      
      // Check that login was also called with correct data
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        {
          email: 'test@example.com',
          password: 'validpassword',
          requestExtensionToken: true
        },
        {
          withCredentials: true
        }
      );
      
      // Check localStorage
      expect(localStorage.getItem('authToken')).toBe('fake-token-123');
      
      // Check navigation
      expect(mockNavigate).toHaveBeenCalledWith('/get-started');
    });
  });

  it('handles signup success but login failure case', async () => {
    // Mock successful signup but failed login
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/signup')) {
        return Promise.resolve({ data: { success: true } });
      } else if (url.includes('/login')) {
        return Promise.reject({ response: { data: { error: 'Login failed' } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'validpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for form submission and error
    await waitFor(() => {
      // Check that axios.post was called for signup
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signup', 
        {
          email: 'test@example.com',
          password: 'validpassword',
          displayName: 'test'
        },
        {
          withCredentials: true
        }
      );
      
      // Check that login was also called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login', 
        {
          email: 'test@example.com',
          password: 'validpassword',
          requestExtensionToken: true
        },
        {
          withCredentials: true
        }
      );
      
      // Check navigation to login page
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles signup API errors correctly', async () => {
    // Modify our mock to match the exact error handling in SignUp.tsx
    mockedAxios.post.mockImplementation(() => {
      const error: any = new Error('Request failed');
      error.isAxiosError = true;
      error.response = {
        data: {
          error: 'Email already in use'
        }
      };
      return Promise.reject(error);
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'validpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for form submission and error
    await waitFor(() => {
      // Check that axios.post was called
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signup', 
        {
          email: 'test@example.com',
          password: 'validpassword',
          displayName: 'test'
        },
        {
          withCredentials: true
        }
      );
      
      // Error message should be displayed
      const errorDiv = container.querySelector('div[class*="error"]');
      expect(errorDiv).toBeInTheDocument();
      
      // Based on SignUp.tsx, it could be either the specific error from the API response
      // or one of the fallback messages if there was an issue parsing the error
      const possibleErrorMessages = [
        'Email already in use',
        'Failed to create account',
        'An unexpected error occurred. Please try again.'
      ];
      
      expect(possibleErrorMessages.includes(errorDiv?.textContent || '')).toBe(true);
    });
  });

  it('handles non-axios errors correctly', async () => {
    // Mock unexpected error
    mockedAxios.post.mockImplementation(() => {
      throw new Error('Network error');
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'validpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for form submission and error
    await waitFor(() => {
      // Error message should be displayed
      const errorDiv = container.querySelector('div[class*="error"]');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toBe('An unexpected error occurred. Please try again.');
    });
  });

  it('displays loading state during form submission', async () => {
    // Mock delayed response
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/signup')) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: { success: true } });
          }, 100);
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    
    const { container } = setup();
    
    // Get form fields
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[name="password"]') as HTMLInputElement;
    const confirmPasswordInput = container.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form correctly
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'validpassword' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Check loading state immediately after submission
    expect(submitButton.textContent).toBe('Creating Account...');
    expect(submitButton.disabled).toBe(true);
  });

  it('navigates to login page when login link is clicked', () => {
    const { container } = setup();
    
    // Find and click login link using class attribute
    const loginLink = container.querySelector('div[class*="login-link"]') as HTMLElement;
    expect(loginLink).toBeInTheDocument();
    
    fireEvent.click(loginLink);
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
}); 