/**
 * Lookup Component
 * 
 * This component serves as the initial signup/authentication page where users can choose
 * their preferred method of creating an account. It provides options for different
 * authentication methods and a link to the login page for existing users.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import GradientBackgroundWrapper from './GradientBackgroundWrapper';
import styles from './Lookup.module.css'
import authButtons from '../data/authButtons.json'

const Lookup: React.FC = () => {
  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Handler for email signup navigation
  const handleEmailSignup = () => {
    navigate('/signup');
  };

  // Handler for login page navigation
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <GradientBackgroundWrapper>
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {/* Main header section */}
          <h1 className={styles.header}>
            Create an Account
          </h1>
          <p className={styles.subtext}>
            Just a few details to get started
          </p>

          {/* Authentication method buttons */}
          {authButtons.buttons.map((button, index) => (
            <button 
              key={index} 
              className={styles['button-rectangle']}
              onClick={button.method === 'Email' ? handleEmailSignup : undefined}
            >
              <img src={button.iconPath} alt={`${button.method} icon`} className={styles['button-icon']} />
              Sign Up with {button.method}
            </button>
          ))}

          {/* Divider section between auth buttons and login link */}
          <div className={styles.divider}>
            <div className={styles['divider-line']}></div>
            <div className={styles['divider-text']}>Or</div>
            <div className={styles['divider-line']}></div>
          </div>

          {/* Login section for existing users */}
          <div className={styles['login-section']}>
            <span className={styles['login-text']}>Already have an account?</span>
            <div className={styles['login-link']} onClick={handleLogin}>
              Login
              <img src="../src/assets/arrow.svg" alt="arrow" className={styles['arrow-icon']} />
            </div>
          </div>
        </div>
      </div>
    </GradientBackgroundWrapper>
  )
}

export default Lookup 