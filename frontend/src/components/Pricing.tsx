import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import styles from './Pricing.module.css';
import { FaCheck } from 'react-icons/fa';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: string;
  tag?: string;
}

interface PricingCardProps {
  tier: PricingTier;
  delay: number;
  isVisible: boolean;
}

// Feature strings can wrap a segment in **double asterisks** to render it bold,
// e.g. "Up to **5 synced classes**".
const renderFeatureText = (text: string): React.ReactNode => {
  const parts = text.split('**');
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  );
};

const PricingCard = memo(({ tier, delay, isVisible }: PricingCardProps) => {
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
    <div
      className={`${styles.pricingCard} ${tier.highlight ? styles.pricingCardHighlight : ''} ${isVisible ? styles.animatedVisible : ''}`}
      style={cardStyle}
    >
      {tier.highlight && <span className={styles.highlightTag}>{tier.highlight}</span>}
      <div className={styles.cardHeader}>
        <h3>{tier.name}</h3>
        {tier.tag && <span className={styles.titleTag}>{tier.tag}</span>}
      </div>
      <p className={styles.tierDescription}>{tier.description}</p>
      <p className={styles.price}>
        <span className={styles.priceAmount}>{tier.price}</span>
        <span className={styles.pricePeriod}>{tier.period}</span>
      </p>
      <div className={styles.divider} />
      <ul className={styles.featureList}>
        {tier.features.map((feature) => (
          <li key={feature}>
            <FaCheck className={styles.checkIcon} />
            <span>{renderFeatureText(feature)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

PricingCard.displayName = 'PricingCard';

const Pricing: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const pricingRef = useRef<HTMLElement>(null);

  const titleStyle = {
    opacity: 0,
    transform: 'translateY(-30px)',
    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    ...(isVisible && {
      opacity: 1,
      transform: 'translateY(0)'
    })
  };

  const pricingTiers = useMemo<PricingTier[]>(() => [
    {
      name: 'Free',
      price: '$0',
      period: '/forever',
      description: 'Get organized without spending a thing.',
      features: [
        'Up to **5 synced classes**',
        'Real-time Canvas to Notion sync',
        'Standard support'
      ]
    },
    {
      name: 'Pro',
      price: '$1',
      period: '/mo',
      description: 'Unlimited sync, billed monthly.',
      features: [
        '**Unlimited** class sync',
        '**Priority** student support',
        'Cancel anytime'
      ]
    },
    {
      name: 'Lifetime',
      price: '$10',
      period: 'ONE-TIME',
      description: 'Pay once, sync forever throughout college.',
      features: [
        '**Everything in Pro** plan',
        'One payment, no recurring renewals',
        'All future updates included'
      ],
      highlight: 'MOST POPULAR',
      tag: 'Best Value'
    }
  ], []);

  useEffect(() => {
    setIsVisible(false);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setTimeout(() => observer.disconnect(), 100);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px"
      }
    );

    if (pricingRef.current) {
      observer.observe(pricingRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section className={styles.pricing} id="pricing" ref={pricingRef}>
      <h2 className={`${styles.sectionTitle} ${isVisible ? styles.animatedVisible : ''}`} style={titleStyle}>Pricing</h2>
      <p className={`${styles.sectionSubtitle} ${isVisible ? styles.animatedVisible : ''}`} style={titleStyle}>
        Simple plans that scale with how much you sync.
      </p>
      <div className={styles.pricingGrid}>
        {pricingTiers.map((tier, index) => (
          <PricingCard
            key={tier.name}
            tier={tier}
            delay={index * 150}
            isVisible={isVisible}
          />
        ))}
      </div>
    </section>
  );
};

export default memo(Pricing);
