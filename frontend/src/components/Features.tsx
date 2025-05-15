import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import styles from './Features.module.css';
import { FaSync, FaCalendarAlt, FaBullseye, FaLock } from 'react-icons/fa';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
  isVisible: boolean;
}

const FeatureCard = memo(({ icon: Icon, title, description, delay, isVisible }: FeatureCardProps) => {
  const cardStyle = {
    opacity: 0,
    transform: 'translateY(-30px)',
    transition: `opacity 0.6s ease-out, transform 0.6s ease-out`,
    transitionDelay: `${delay}ms`,
    ...(isVisible && {
      opacity: 1,
      transform: 'translateY(0)'
    })
  };

  return (
    <div className={`${styles.featureCard} ${isVisible ? styles.animatedVisible : ''}`} style={cardStyle}>
      <div className={styles.featureIcon}>
        <div className={styles.iconGradient}>
          <Icon className={styles.icon} />
        </div>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

const Features: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const featuresRef = useRef<HTMLElement>(null);

  const titleStyle = {
    opacity: 0,
    transform: 'translateY(-30px)',
    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    ...(isVisible && {
      opacity: 1,
      transform: 'translateY(0)'
    })
  };

  const featureCardsData = useMemo(() => [
    {
      icon: FaSync,
      title: "Automatic Sync",
      description: "Your Canvas assignments are automatically synced to your Notion workspace in real-time."
    },
    {
      icon: FaCalendarAlt,
      title: "Smart Organization",
      description: "Assignments are organized by course and due date in your Notion database."
    },
    {
      icon: FaBullseye,
      title: "Stay on Track",
      description: "Never miss a deadline with integrated Notion reminders and progress tracking."
    },
    {
      icon: FaLock,
      title: "Secure & Private",
      description: "Your data is encrypted and securely synchronized between Canvas and Notion."
    }
  ], []);

  useEffect(() => {
    // Initialize visibility to false
    setIsVisible(false);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Only disconnect after setting visible to ensure animation happens
            setTimeout(() => observer.disconnect(), 100);
          }
        });
      },
      { 
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px" // Trigger earlier
      }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section className={styles.features} id="about" ref={featuresRef}>
      <h2 className={`${styles.sectionTitle} ${isVisible ? styles.animatedVisible : ''}`} style={titleStyle}>How It Works</h2>
      <div className={styles.featureGrid}>
        {featureCardsData.map((card, index) => (
          <FeatureCard
            key={index}
            icon={card.icon}
            title={card.title}
            description={card.description}
            delay={index * 150}
            isVisible={isVisible}
          />
        ))}
      </div>
    </section>
  );
};

export default memo(Features); 