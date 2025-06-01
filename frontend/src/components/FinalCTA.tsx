import React, { useCallback } from 'react';
import styles from './FinalCTA.module.css';
import { FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

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
          <motion.button 
            onClick={handleInstallClick} 
            className={styles.finalCtaButton}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)" 
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Get Started Now <FaArrowRight className={styles.arrowIcon} />
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA; 