import React, { useCallback } from 'react';
import styles from './FinalCTA.module.css';
import { FaArrowRight } from 'react-icons/fa';

const FinalCTA: React.FC = () => {
  const handleInstallClick = useCallback(() => {
    window.open('https://chromewebstore.google.com/', '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <section className={styles.finalCta}>
      <div className={`${styles.finalCtaCard} ${styles.visible}`}>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>Simplify Your Workflow.</h2>
          <p className={styles.finalCtaSubtitle}>
            Start organizing your Canvas assignments in Notion. It's completely free with no hidden fees!
          </p>
          <button onClick={handleInstallClick} className={styles.finalCtaButton}>
            Get Started Now <FaArrowRight className={styles.arrowIcon} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA; 