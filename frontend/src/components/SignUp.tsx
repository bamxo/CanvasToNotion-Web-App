import React, { useState } from 'react';
import styles from './SignUp.module.css';
import GradientBackgroundWrapper from './GradientBackgroundWrapper';

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
  };

  return (
    <GradientBackgroundWrapper>
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <h1 className={styles.header}>Create an Account</h1>
          <p className={styles.subtext}>Just a few details to get started</p>
          <form onSubmit={handleSubmit} className={styles['signup-form']}>
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
            <div className={styles['form-group']}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className={styles['button-rectangle']}>Create Account</button>
          </form>
        </div>
      </div>
    </GradientBackgroundWrapper>
  );
};

export default SignUp; 