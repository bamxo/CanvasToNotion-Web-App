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

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  // State to manage form input
  const [formData, setFormData] = React.useState({
    email: ''
  });

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
  };

  /**
   * Handles form submission
   * Currently logs the email for password reset (TODO: implement actual reset logic)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password reset logic
    console.log('Password reset requested for:', formData.email);
  };

  return (
    <GradientBackgroundWrapper>
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Header Section */}
          <h1 className={styles.header}>Forgot your Password?</h1>
          <p className={styles.subtext}>We'll email instructions to reset your password</p>

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
              />
            </div>

            <button type="submit" className={styles['button-rectangle']}>
              Email Password Reset
            </button>
          </form>

          {/* Return to Login Link */}
          <div className={styles['back-to-login']}>
            <div className={styles['login-link']} onClick={() => navigate('/login')}>
              Return to Login
            </div>
          </div>
        </div>
      </div>
    </GradientBackgroundWrapper>
  );
};

export default ForgotPassword;
