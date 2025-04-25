import React, { useMemo, memo } from 'react';
import styles from './Features.module.css';
import { FaSync, FaCalendarAlt, FaBullseye, FaLock } from 'react-icons/fa';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard = memo(({ icon: Icon, title, description }: FeatureCardProps) => (
  <div className={styles.featureCard}>
    <div className={styles.featureIcon}>
      <div className={styles.iconGradient}>
        <Icon className={styles.icon} />
      </div>
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
));

FeatureCard.displayName = 'FeatureCard';

const Features: React.FC = () => {
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

  return (
    <section className={styles.features} id="about">
      <h2 className={styles.sectionTitle}>How It Works</h2>
      <div className={styles.featureGrid}>
        {featureCardsData.map((card, index) => (
          <FeatureCard
            key={index}
            icon={card.icon}
            title={card.title}
            description={card.description}
          />
        ))}
      </div>
    </section>
  );
};

export default memo(Features); 