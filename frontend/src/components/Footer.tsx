import React from 'react';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLeft}>
          <img src="/src/assets/c2n_favicon.svg" alt="Canvas to Notion Logo" className={styles.footerLogo} />
          <p>Seamlessly sync your Canvas assignments with Notion</p>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p>&copy; 2025 Canvas to Notion. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 