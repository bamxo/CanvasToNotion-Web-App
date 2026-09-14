/**
 * FreePlanCard
 *
 * The "Plan" section shown to free-tier users: standard access, ad-supported,
 * capped class-sync usage, with upgrade paths to Pro or Lifetime. Checkout is
 * self-contained here (like Settings' portal/refund actions) so a failed
 * request surfaces an error instead of failing silently.
 */
import React, { useState } from 'react';
import axios from 'axios';
import styles from './FreePlanCard.module.css';
import { BILLING_ENDPOINTS } from '../../../utils/api';
import { secureGetToken } from '../../../utils/encryption';

interface FreePlanCardProps {
  classSyncUsed: number;
  classSyncLimit: number | null;
  notionConnected: boolean;
}

type Plan = 'pro' | 'lifetime';

const FreePlanCard: React.FC<FreePlanCardProps> = ({
  classSyncUsed,
  classSyncLimit,
  notionConnected,
}) => {
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const limit = classSyncLimit ?? 0;
  const used = Math.min(classSyncUsed, limit);
  const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const remaining = Math.max(limit - classSyncUsed, 0);

  const startCheckout = async (plan: Plan) => {
    setBusyPlan(plan);
    setError(null);
    try {
      const token = secureGetToken('authToken');
      const res = await axios.post(
        BILLING_ENDPOINTS.CHECKOUT,
        { plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setBusyPlan(null);
    }
  };

  const isBusy = busyPlan !== null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.topRow}>
        <div className={styles.main}>
          <span className={styles.badge}>
            <span className={styles.dot} />
            Free Plan (Active)
          </span>
          <h3 className={styles.heading}>Standard Tier</h3>
          <p className={styles.description}>
            Limited to standard access. Upgrade to unlock unlimited sync.
          </p>
        </div>

        <div className={styles.plansRow}>
          <div className={`${styles.planBox} ${styles.proBox}`}>
            <div>
              <span className={styles.planLabel}>PRO MONTHLY</span>
              <p className={styles.planPrice}>
                <span className={styles.priceAmount}>$1</span>
                <span className={styles.pricePeriod}>/mo</span>
              </p>
            </div>
            <button
              className={styles.upgradeButton}
              onClick={() => startCheckout('pro')}
              disabled={isBusy}
              aria-label="Upgrade"
              aria-busy={busyPlan === 'pro'}
            >
              {busyPlan === 'pro' ? <span className={styles.btnSpinner} aria-hidden="true" /> : 'Upgrade'}
            </button>
          </div>

          <div className={`${styles.planBox} ${styles.lifetimeBox}`}>
            <span className={styles.popularTag}>POPULAR</span>
            <div>
              <p className={styles.planTitle}>Lifetime Pass</p>
              <p className={styles.planPrice}>
                <span className={styles.priceAmount}>$10</span>
                <span className={styles.pricePeriod}>one-time</span>
              </p>
            </div>
            <button
              className={styles.claimButton}
              onClick={() => startCheckout('lifetime')}
              disabled={isBusy}
              aria-label="Claim Lifetime Access"
              aria-busy={busyPlan === 'lifetime'}
            >
              {busyPlan === 'lifetime' ? <span className={styles.btnSpinner} aria-hidden="true" /> : 'Claim Lifetime Access'}
            </button>
          </div>
        </div>
      </div>

      {error && <p className={styles.errorText} role="alert">{error}</p>}

      {notionConnected ? (
        <div className={styles.usageCard}>
          <div className={styles.usageRow}>
            <span className={styles.usageLabel}>Class Sync Usage</span>
            <span className={styles.usageCount}>
              {classSyncUsed} / {limit} classes synced ({percent}%)
            </span>
          </div>
          <div className={styles.usageBarTrack}>
            <div className={styles.usageBarFill} style={{ width: `${percent}%` }} />
          </div>
          <p className={styles.footnote}>
            {remaining} {remaining === 1 ? 'class' : 'classes'} remaining. Free tier includes up to{' '}
            {limit} synced classes. Upgrade for unlimited synchronizations.
          </p>
        </div>
      ) : (
        <div className={styles.usageCard}>
          <div className={styles.usageRow}>
            <span className={styles.usageLabel}>Class Sync Usage</span>
            <span className={styles.usageCountMuted}>
              Connect Notion to start syncing your classes
            </span>
          </div>
          <div className={styles.usageBarTrack}>
            <div className={styles.usageBarFill} style={{ width: '0%' }} />
          </div>
          <p className={styles.footnote}>
            Connect your Notion workspace to automatically sync up to {limit || 5} courses on the
            Free tier.
          </p>
        </div>
      )}
    </div>
  );
};

export default FreePlanCard;
