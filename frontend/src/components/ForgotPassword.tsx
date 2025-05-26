/**
 * ForgotPassword Component
 * 
 * This component handles the password reset request functionality.
 * It provides a form where users can enter their email address to receive
 * password reset instructions.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import { mapFirebaseError } from '../utils/errorMessages';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  // State to manage form input and UI states
  const [formData, setFormData] = React.useState({
    email: ''
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  /**
   * Handles input changes in the form
   * Updates the formData state with the new value
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous error when user starts typing
    setError(null);
  };

  /**
   * Handles form submission
   * Sends a password reset request to the backend
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Create an error object that our utility can handle
        const errorObj = {
          response: {
            data: {
              error: data.error
            }
          }
        };
        throw errorObj;
      }

      setSuccess(true);
    } catch (err) {
      // Use the new error mapping utility
      const userFriendlyMessage = mapFirebaseError(err, 'Failed to send password reset email. Please try again.');
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <GradientBackgroundWrapper />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header Section */}
          <h1 className={styles.header}>Forgot your Password?</h1>
          <p className={styles.subtext}>We'll email instructions to reset your password</p>

          {/* Success Message */}
          {success ? (
            <div className={styles.successMessage}>
              <p>Password reset instructions have been sent to your email.</p>
            </div>
          ) : (
            <>
              {/* Password Reset Form */}
              <form onSubmit={handleSubmit} className={styles['forgot-password-form']}>
                <div className={styles['form-group']}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Error Message */}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <button 
                  type="submit" 
                  className={styles['button-rectangle']}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Email Password Reset'}
                </button>
              </form>
            </>
          )}

          {/* Return to Login Link */}
          <div className={styles['back-to-login']}>
            <div className={styles['login-link']} onClick={() => navigate('/login')}>
              Return to Login
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
