/**
 * ResetPassword Component
 *
 * Lands here from the branded password-reset email:
 *   /reset-password?oobCode=<code>
 *
 * Reads the oobCode from the query string, collects a new password, and posts
 * both to the backend (POST /auth/reset-password), which confirms the reset
 * with Firebase. On success the user is sent to /login.
 */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './ResetPassword.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg';
import eyeSlashIcon from '../assets/eye-slash.svg';
import { validateForm, mapFirebaseError } from '../utils/errorMessages';
import { AUTH_ENDPOINTS } from '../utils/api';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when the user starts typing
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate the new password (dummy email keeps the shared validator happy).
    const validationError = validateForm('dummy@email.com', formData.password, formData.confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(AUTH_ENDPOINTS.RESET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oobCode, newPassword: formData.password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Shape the error so mapFirebaseError can look up a friendly message.
        throw { response: { data: { error: data.error } } };
      }

      navigate('/login');
    } catch (err) {
      const userFriendlyMessage = mapFirebaseError(err, 'Failed to reset password. Please try again.');
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {!oobCode ? (
            <>
              <h1 className={styles.header}>Reset link is invalid or expired</h1>
              <p className={styles.subtext}>
                This password reset link is invalid or expired. Request a new one to try again.
              </p>
              <button
                type="button"
                className={styles['button-rectangle']}
                onClick={() => navigate('/forgot-password')}
              >
                Request a new link
              </button>
              <div className={styles['login-section']}>
                <div className={styles['login-link']} onClick={handleLogin}>
                  Return to Login
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className={styles.header}>Reset your Password</h1>
              <p className={styles.subtext}>Enter and confirm your new password.</p>

              <form onSubmit={handleSubmit} className={styles['reset-form']}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles['form-group']}>
                  <label htmlFor="password">New Password</label>
                  <div className={styles['password-input-container']}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <img
                      src={showPassword ? eyeSlashIcon : eyeIcon}
                      alt="toggle password visibility"
                      className={styles['eye-icon']}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className={styles['password-input-container']}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <img
                      src={showPassword ? eyeSlashIcon : eyeIcon}
                      alt="toggle password visibility"
                      className={styles['eye-icon']}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles['button-rectangle']}
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className={styles['login-section']}>
                <div className={styles['login-link']} onClick={handleLogin}>
                  Return to Login
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
