import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import ResetPassword from '../components/ResetPassword';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_ENDPOINTS } from '../utils/api';

// Mock the CSS module
vi.mock('../components/ResetPassword.module.css', () => ({
  default: {
    pageWrapper: 'pageWrapper-mock',
    container: 'container-mock',
    header: 'header-mock',
    subtext: 'subtext-mock',
    'reset-form': 'reset-form-mock',
    error: 'error-mock',
    'form-group': 'form-group-mock',
    'password-input-container': 'password-input-container-mock',
    'eye-icon': 'eye-icon-mock',
    'button-rectangle': 'button-rectangle-mock',
    'login-section': 'login-section-mock',
    'login-link': 'login-link-mock'
  }
}));

vi.mock('../assets/ph_eye.svg', () => ({ default: 'eye-icon-mock' }));
vi.mock('../assets/eye-slash.svg', () => ({ default: 'eye-slash-icon-mock' }));
vi.mock('../components/GradientBackgroundWrapper', () => ({
  default: () => <div data-testid="gradient-background-wrapper" />
}));

// Mock useNavigate, keep the rest of react-router-dom real (useSearchParams).
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

global.fetch = vi.fn();
const mockFetch = global.fetch as unknown as ReturnType<typeof vi.fn>;

const OOB = 'valid-oob-code';

const setup = (search = `?oobCode=${OOB}`) => {
  cleanup();
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <ResetPassword />
    </MemoryRouter>
  );
};

const fillForm = (container: HTMLElement, pw: string, confirm = pw) => {
  fireEvent.change(container.querySelector('#password') as HTMLInputElement, {
    target: { value: pw }
  });
  fireEvent.change(container.querySelector('#confirmPassword') as HTMLInputElement, {
    target: { value: confirm }
  });
};

describe('ResetPassword Component', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders the form when an oobCode is present in the URL', () => {
    const { container } = setup();
    expect(container.querySelector('h1')).toHaveTextContent('Reset your Password');
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(2);
    expect(container.querySelector('button[type="submit"]')).toHaveTextContent('Reset Password');
  });

  it('shows an invalid-link message and no form when the oobCode is missing', () => {
    const { container } = setup('');
    expect(container.querySelector('button[type="submit"]')).not.toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).toContain('invalid or expired');
  });

  it('shows an error when the password is less than 8 characters', () => {
    const { container } = setup();
    fillForm(container, 'short');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(container.querySelector('.error-mock')).toHaveTextContent(
      'Password must be at least 8 characters long'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows an error when the passwords do not match', () => {
    const { container } = setup();
    fillForm(container, 'password12345', 'password99999');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(container.querySelector('.error-mock')).toHaveTextContent('Passwords do not match');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('posts the oobCode and new password, then navigates to login on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: 'ok' }) });

    const { container } = setup();
    fillForm(container, 'password12345');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));

    expect(mockFetch).toHaveBeenCalledWith(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ oobCode: OOB, newPassword: 'password12345' })
      })
    );
  });

  it('shows a mapped error message when the reset code is expired', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'EXPIRED_OOB_CODE' })
    });

    const { container } = setup();
    fillForm(container, 'password12345');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() =>
      expect(container.querySelector('.error-mock')).toHaveTextContent('This link has expired')
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));

    const { container } = setup();
    fillForm(container, 'password12345');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() =>
      expect(container.querySelector('.error-mock')).toHaveTextContent(
        'An unexpected error occurred. Please try again.'
      )
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears the error once the user edits the form again', () => {
    const { container } = setup();
    fillForm(container, 'password12345', 'password99999');
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    expect(container.querySelector('.error-mock')).toBeInTheDocument();

    fireEvent.change(container.querySelector('#password') as HTMLInputElement, {
      target: { value: 'a-different-value' }
    });
    expect(container.querySelector('.error-mock')).not.toBeInTheDocument();
  });

  it('navigates to login when "Return to Login" is clicked', () => {
    const { container } = setup();
    fireEvent.click(container.querySelector('.login-link-mock') as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
