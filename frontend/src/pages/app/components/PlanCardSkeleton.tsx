/**
 * PlanCardSkeleton
 *
 * Loading placeholder for the Settings "Plan" section. Shown while
 * useEntitlements is still fetching so the Free / Standard card never flashes
 * for a user who is actually on Pro, Lifetime, or Legacy.
 */
import React from 'react';
import Skeleton from './Skeleton';
import styles from './PlanCardSkeleton.module.css';

const PlanCardSkeleton: React.FC = () => (
  <div className={styles.wrapper} data-testid="plan-card-skeleton" aria-hidden="true">
    <div className={styles.topRow}>
      <div className={styles.main}>
        <Skeleton width={110} height={22} radius={999} />
        <Skeleton width={160} height={20} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>

      <div className={styles.plansRow}>
        <div className={styles.planBox}>
          <Skeleton width={90} height={12} />
          <Skeleton width={70} height={24} />
          <Skeleton width="100%" height={34} radius={8} />
        </div>
        <div className={styles.planBox}>
          <Skeleton width={90} height={12} />
          <Skeleton width={70} height={24} />
          <Skeleton width="100%" height={34} radius={8} />
        </div>
      </div>
    </div>

    <div className={styles.usageCard}>
      <Skeleton width={200} height={14} />
      <Skeleton width="100%" height={8} radius={999} />
      <Skeleton width="60%" height={12} />
    </div>
  </div>
);

export default PlanCardSkeleton;
