/**
 * ProPlanCard
 *
 * The "Plan" section shown to Pro (monthly subscription) users. Layout mirrors
 * the other plan cards: a left block with status badges + heading, a right
 * "aside" that pitches the Lifetime upgrade and exposes billing controls, and a
 * full-width sync card whose header carries the renewal date above the bar.
 *
 * `currentPeriodEnd` is a Unix epoch in seconds (as Stripe reports it) and is
 * optional so the card still renders before the webhook has populated it. When
 * `cancelAtPeriodEnd` is set the subscription is ending, so the date is framed
 * as "Access ends" and the footnote explains access continues until then.
 */
import React, { useEffect, useState } from 'react';
import styles from './ProPlanCard.module.css';

type PendingAction = 'switch' | 'billing' | 'cancel' | 'reactivate' | null;

interface ProPlanCardProps {
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
  subscriptionStatus?: string | null;
  syncedCount: number;
  onSwitchToLifetime: () => void;
  onManageBilling: () => void;
  onCancelSubscription: () => void;
  onReactivate: () => void;
  busy: boolean;
}

const formatDate = (epochSeconds?: number | null): string | null => {
  if (!epochSeconds) return null;
  const date = new Date(epochSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  // Format in UTC to match the other plan cards: the period end is a UTC instant
  // and shifting it to the viewer's zone can move the displayed calendar date.
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const ProPlanCard: React.FC<ProPlanCardProps> = ({
  currentPeriodEnd,
  cancelAtPeriodEnd,
  subscriptionStatus,
  syncedCount,
  onSwitchToLifetime,
  onManageBilling,
  onCancelSubscription,
  onReactivate,
  busy,
}) => {
  const formattedDate = formatDate(currentPeriodEnd);
  const pastDue = subscriptionStatus === 'past_due';
  const ending = Boolean(cancelAtPeriodEnd);

  // Which button the user pressed, so only that one spins. Cleared when the
  // parent's `busy` flag drops (e.g. a failed request that never navigated away).
  const [pending, setPending] = useState<PendingAction>(null);
  useEffect(() => {
    if (!busy) setPending(null);
  }, [busy]);

  const run = (action: Exclude<PendingAction, null>, fn: () => void) => () => {
    setPending(action);
    fn();
  };

  let renewalLabel: string;
  let renewalValue: string;
  if (pastDue) {
    renewalLabel = 'Payment due:';
    renewalValue = formattedDate ?? 'now';
  } else if (ending) {
    renewalLabel = 'Access ends:';
    renewalValue = formattedDate ?? 'soon';
  } else if (formattedDate) {
    renewalLabel = 'Next renewal:';
    renewalValue = `${formattedDate} · $1.00`;
  } else {
    renewalLabel = 'Next renewal:';
    renewalValue = 'pending';
  }

  const footnote = pastDue
    ? "We'll keep retrying your card. Pro access continues for now — update your payment method to avoid losing it."
    : ending
      ? formattedDate
        ? `Your subscription cancels on ${formattedDate}. Pro access continues until then.`
        : 'Your subscription is set to cancel at the end of the billing period.'
      : syncedCount > 0
        ? 'All classes syncing with Notion in real-time'
        : 'Unlimited class synchronizations and automation features while your subscription is active.';

  return (
    <div className={styles.wrapper}>
      {pastDue && (
        <div className={styles.alert} role="alert">
          <div className={styles.alertBody}>
            <svg
              className={styles.alertIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.alertText}>
              Your last payment didn&apos;t go through. Update your payment method to keep Pro access.
            </span>
          </div>
          <button
            className={styles.alertButton}
            onClick={run('billing', onManageBilling)}
            disabled={busy}
            aria-label="Update payment method"
            aria-busy={pending === 'billing'}
          >
            {pending === 'billing' ? (
              <span className={styles.btnSpinnerDark} aria-hidden="true" />
            ) : (
              <>Update payment method <span aria-hidden="true">→</span></>
            )}
          </button>
        </div>
      )}

      <div className={styles.topRow}>
        <div className={styles.main}>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.badgePlan}`}>
              <span className={styles.dot} />
              Pro Monthly
            </span>
            <span className={`${styles.badge} ${styles.badgeStatus} ${pastDue ? styles.badgePastDue : ending ? styles.badgeEnding : ''}`}>
              <span className={styles.dot} />
              {pastDue ? 'Payment Failed' : ending ? 'Cancels Soon' : 'Active Subscription'}
            </span>
          </div>
          <h3 className={styles.heading}>Pro Account</h3>
          <p className={styles.description}>
            Unlimited sync &amp; automation, billed monthly.
          </p>
        </div>

        <div className={styles.aside}>
          <div className={styles.upgradeBox}>
            <span className={styles.upgradeTag}>UPGRADE OFFER</span>
            <div>
              <p className={styles.upgradeTitle}>Lifetime Pass</p>
              <p className={styles.upgradePrice}>
                <span className={styles.priceAmount}>$10</span>
                <span className={styles.pricePeriod}>one-time</span>
              </p>
            </div>
            <button
              className={styles.switchButton}
              onClick={run('switch', onSwitchToLifetime)}
              disabled={busy}
              aria-label="Switch to Lifetime Pass"
              aria-busy={pending === 'switch'}
            >
              {pending === 'switch'
                ? <span className={styles.btnSpinner} aria-hidden="true" />
                : 'Switch to Lifetime Pass'}
            </button>
          </div>
          <div className={styles.asideLinks}>
            <button
              className={styles.linkButton}
              onClick={run('billing', onManageBilling)}
              disabled={busy}
              aria-label="Manage Billing"
              aria-busy={pending === 'billing'}
            >
              {pending === 'billing'
                ? <span className={styles.btnSpinnerDark} aria-hidden="true" />
                : 'Manage Billing'}
            </button>
            {ending ? (
              <button
                className={styles.linkButton}
                onClick={run('reactivate', onReactivate)}
                disabled={busy}
                aria-label="Reactivate subscription"
                aria-busy={pending === 'reactivate'}
              >
                {pending === 'reactivate'
                  ? <span className={styles.btnSpinnerDark} aria-hidden="true" />
                  : 'Reactivate subscription'}
              </button>
            ) : (
              <button
                className={styles.linkButton}
                onClick={run('cancel', onCancelSubscription)}
                disabled={busy}
                aria-label="Cancel Subscription"
                aria-busy={pending === 'cancel'}
              >
                {pending === 'cancel'
                  ? <span className={styles.btnSpinnerDark} aria-hidden="true" />
                  : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.syncCard}>
        <div className={styles.syncHeader}>
          <span className={styles.syncLabel}>
            Classes Synced: <span className={styles.syncHighlight}>Unlimited</span>
          </span>
          <span className={styles.renewal}>
            <span className={styles.renewalLabel}>{renewalLabel}</span>{' '}
            <span className={styles.renewalValue}>{renewalValue}</span>
          </span>
        </div>
        <div className={styles.syncBarTrack}>
          <div className={styles.syncBarFill} />
        </div>
        <p className={styles.footnote}>{footnote}</p>
      </div>
    </div>
  );
};

export default ProPlanCard;
