import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProPlanCard from './ProPlanCard';

afterEach(cleanup);

// 2025-06-15T00:00:00Z
const JUNE_15_2025 = Math.floor(Date.UTC(2025, 5, 15) / 1000);

const baseProps = {
  syncedCount: 0,
  onSwitchToLifetime: vi.fn(),
  onManageBilling: vi.fn(),
  onCancelSubscription: vi.fn(),
  onReactivate: vi.fn(),
  busy: false,
};

describe('ProPlanCard', () => {
  it('renders the status badges, heading, description and unlimited sync bar', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} />);
    expect(screen.getByText('Pro Monthly')).toBeInTheDocument();
    expect(screen.getByText('Active Subscription')).toBeInTheDocument();
    expect(screen.getByText('Pro Account')).toBeInTheDocument();
    expect(screen.getByText(/unlimited sync & automation, billed monthly/i)).toBeInTheDocument();
    expect(screen.getByText(/classes synced/i)).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('shows the next renewal date with price above the bar', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} />);
    expect(screen.getByText('Next renewal:')).toBeInTheDocument();
    expect(screen.getByText('Jun 15, 2025 · $1.00')).toBeInTheDocument();
  });

  it('falls back to a pending state when the period end has not synced yet', () => {
    render(<ProPlanCard {...baseProps} />);
    expect(screen.getByText('Next renewal:')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('frames the date as access-until and flags the ending state when cancelAtPeriodEnd is set', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} cancelAtPeriodEnd />);
    expect(screen.getByText('Cancels Soon')).toBeInTheDocument();
    expect(screen.getByText('Access ends:')).toBeInTheDocument();
    expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
    expect(screen.getByText(/your subscription cancels on jun 15, 2025/i)).toBeInTheDocument();
  });

  it('swaps Cancel Subscription for Reactivate subscription when the sub is ending', () => {
    const onReactivate = vi.fn();
    const onCancelSubscription = vi.fn();
    render(
      <ProPlanCard
        {...baseProps}
        currentPeriodEnd={JUNE_15_2025}
        cancelAtPeriodEnd
        onReactivate={onReactivate}
        onCancelSubscription={onCancelSubscription}
      />
    );
    expect(screen.queryByRole('button', { name: /cancel subscription/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reactivate subscription/i }));
    expect(onReactivate).toHaveBeenCalledTimes(1);
    expect(onCancelSubscription).not.toHaveBeenCalled();
  });

  it('shows Cancel Subscription (not Reactivate) while the sub is active', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} />);
    expect(screen.getByRole('button', { name: /cancel subscription/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reactivate subscription/i })).not.toBeInTheDocument();
  });

  it('shows a payment-failed alert, badge and CTA when subscriptionStatus is past_due', () => {
    const onManageBilling = vi.fn();
    render(
      <ProPlanCard
        {...baseProps}
        currentPeriodEnd={JUNE_15_2025}
        subscriptionStatus="past_due"
        onManageBilling={onManageBilling}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/last payment didn.?t go through/i);
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    expect(screen.getByText('Payment due:')).toBeInTheDocument();
    expect(screen.getByText(/we.?ll keep retrying your card/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /update payment method/i }));
    expect(onManageBilling).toHaveBeenCalledTimes(1);
  });

  it('shows no payment-failed alert while the subscription is active', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} subscriptionStatus="active" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Failed')).not.toBeInTheDocument();
    expect(screen.getByText('Next renewal:')).toBeInTheDocument();
  });

  it('shows the real-time sync footnote when at least one class is synced', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} syncedCount={18} />);
    expect(screen.getByText('All classes syncing with Notion in real-time')).toBeInTheDocument();
  });

  it('wires the upgrade, manage-billing and cancel actions', () => {
    const onSwitchToLifetime = vi.fn();
    const onManageBilling = vi.fn();
    const onCancelSubscription = vi.fn();
    render(
      <ProPlanCard
        {...baseProps}
        currentPeriodEnd={JUNE_15_2025}
        onSwitchToLifetime={onSwitchToLifetime}
        onManageBilling={onManageBilling}
        onCancelSubscription={onCancelSubscription}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /switch to lifetime pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage billing/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
    expect(onSwitchToLifetime).toHaveBeenCalledTimes(1);
    expect(onManageBilling).toHaveBeenCalledTimes(1);
    expect(onCancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('marks the upgrade button as busy once pressed', () => {
    // busy stays true so the pending state is not cleared by the effect
    const { rerender } = render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} />);
    const button = screen.getByRole('button', { name: /switch to lifetime pass/i });
    expect(button).toHaveAttribute('aria-busy', 'false');
    fireEvent.click(button);
    rerender(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} busy />);
    // keeps its accessible name via aria-label, but the text label is replaced
    // by a spinner and it reports busy
    expect(screen.getByRole('button', { name: /switch to lifetime pass/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /switch to lifetime pass/i })).toHaveTextContent('');
  });

  it('disables every action while busy', () => {
    render(<ProPlanCard {...baseProps} currentPeriodEnd={JUNE_15_2025} busy />);
    expect(screen.getByRole('button', { name: /switch to lifetime pass/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel subscription/i })).toBeDisabled();
  });
});
