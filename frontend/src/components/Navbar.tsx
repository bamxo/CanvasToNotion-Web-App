import React from 'react';
import styles from './Navbar.module.css';

interface NavbarProps {
  isScrolled: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isScrolled }) => {
  const handleInstallClick = () => {
    window.open('https://chromewebstore.google.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ''}`}>
      <div className={styles.navContainer}>
        <div className={styles.navLeft}>
          <img src="/src/assets/c2n_logo dark.svg" alt="Canvas to Notion Logo" className={styles.logo} onClick={() => window.location.href = '/'} />
        </div>
        <div className={styles.navRight}>
          <div className={styles.navLinks}>
            <a href="/" className={styles.navLink}>Home</a>
            <a href="/about" className={styles.navLink}>About</a>
          </div>
          <button onClick={handleInstallClick} className={styles.installButton}>
            Install Extension
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 