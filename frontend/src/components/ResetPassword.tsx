/**
 * ResetPassword Component
 * 
 * This component handles the password reset functionality.
 * It provides a form for users to enter and confirm their new password,
 * with password visibility toggle functionality.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ResetPassword.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import eyeIcon from '../assets/ph_eye.svg';
import eyeSlashIcon from '../assets/Eye Slash.svg';

const ResetPassword: React.FC = () => {
  // State for form data management
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // State for error handling
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Handler for form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError('');
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // TODO: Implement password reset API call
    try {
      // Placeholder for API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/login');
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for login page navigation
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header section */}
          <h1 className={styles.header}>Reset your Password</h1>
          <p className={styles.subtext}>Enter and confirm your new password.</p>

          {/* Reset password form */}
          <form onSubmit={handleSubmit} className={styles['reset-form']}>
            {/* Error message display */}
            {error && <div className={styles.error}>{error}</div>}

            {/* New Password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="password">New Password</label>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
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

            {/* Confirm Password input field with visibility toggle */}
            <div className={styles['form-group']}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles['password-input-container']}>
                <input
                  type={showPassword ? "text" : "password"}
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

            {/* Submit button */}
            <button 
              type="submit" 
              className={styles['button-rectangle']}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          {/* Return to login section */}
          <div className={styles['login-section']}>
            <div className={styles['login-link']} onClick={handleLogin}>
              Return to Login
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword; 