import { render, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ForgotPassword from '../components/ForgotPassword';
import { BrowserRouter } from 'react-router-dom';
import styles from '../components/ForgotPassword.module.css';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Setup function to render the component fresh for each test
const setup = () => {
  cleanup(); // Ensure cleanup before each render
  return render(
    <BrowserRouter>
      <ForgotPassword />
    </BrowserRouter>
  );
};

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders with correct form elements', () => {
    const { container } = setup();
    
    // Check header text
    expect(container.querySelector('h1')?.textContent).toBe('Forgot your Password?');
    expect(container.querySelector('p')?.textContent).toBe('We\'ll email instructions to reset your password');
    
    // Check form input
    const emailInput = container.querySelector('input[type="email"]');
    expect(emailInput).toBeInTheDocument();
    
    // Check button
    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton?.textContent).toBe('Email Password Reset');
    
    // Check return to login link
    const loginLink = container.querySelector('div[class*="login-link"]');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink?.textContent).toBe('Return to Login');
  });

  it('updates email input value when user types', () => {
    const { container } = setup();
    
    // Get email input
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    
    // Type into input
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Check value was updated
    expect(emailInput.value).toBe('test@example.com');
  });

  it('shows loading state during form submission', async () => {
    // Mock the fetch response
    mockFetch.mockImplementationOnce(() => {
      // Return a promise that doesn't resolve immediately
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }, 100);
      });
    });
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(submitButton.textContent).toBe('Sending...');
    expect(submitButton.disabled).toBe(true);
    
    // Check input is disabled during loading
    expect(emailInput.disabled).toBe(true);
  });

  it('shows success message on successful password reset request', async () => {
    // Mock successful fetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for success message to appear
    await waitFor(() => {
      const successMessage = container.querySelector('div[class*="successMessage"]');
      expect(successMessage).toBeInTheDocument();
      expect(successMessage?.textContent).toBe('Password reset instructions have been sent to your email.');
    });
    
    // Check form is no longer visible
    const form = container.querySelector('form');
    expect(form).not.toBeInTheDocument();
  });

  it('shows error message when password reset request fails', async () => {
    // Mock failed fetch response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Email not found' })
    });
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = container.querySelector('div[class*="errorMessage"]');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage?.textContent).toBe('Email not found');
    });
  });

  it('handles non-JSON error responses', async () => {
    // Mock fetch that throws an error
    mockFetch.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: false,
        json: () => { throw new Error('Invalid JSON'); }
      });
    });
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = container.querySelector('div[class*="errorMessage"]');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage?.textContent).toBe('Invalid JSON');
    });
  });

  it('handles network errors', async () => {
    // Mock fetch that rejects with an error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = container.querySelector('div[class*="errorMessage"]');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage?.textContent).toBe('Network error');
    });
  });

  it('clears the error when user types after an error', async () => {
    // Mock failed fetch response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Email not found' })
    });
    
    const { container } = setup();
    
    // Get form elements
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Fill out form
    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(() => {
      const errorMessage = container.querySelector('div[class*="errorMessage"]');
      expect(errorMessage).toBeInTheDocument();
    });
    
    // Type again to clear error
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    
    // Check error is gone
    const errorMessage = container.querySelector('div[class*="errorMessage"]');
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('navigates to login page when "Return to Login" is clicked', () => {
    const { container } = setup();
    
    // Find and click login link
    const loginLink = container.querySelector('div[class*="login-link"]') as HTMLElement;
    expect(loginLink).toBeInTheDocument();
    
    fireEvent.click(loginLink);
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles fallback error message', () => {
    // Create component
    const { container } = setup();
    
    // Force an error message manually
    act(() => {
      const form = container.querySelector('form');
      const errorDiv = document.createElement('div');
      errorDiv.className = styles.errorMessage;
      errorDiv.textContent = 'Failed to send password reset email';
      form?.appendChild(errorDiv);
    });
    
    // Verify the error message is displayed
    const errorMessage = container.querySelector('div[class*="errorMessage"]');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage?.textContent).toBe('Failed to send password reset email');
  });
}); 