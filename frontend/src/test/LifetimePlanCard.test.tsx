import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LifetimePlanCard from '../components/LifetimePlanCard';

afterEach(cleanup);

const baseProps = {
  withinRefundWindow: false,
  refundDone: false,
  onBillingHistory: vi.fn(),
  onRefund: vi.fn(),
  busy: false,
};

describe('LifetimePlanCard', () => {
  it('renders a single Lifetime (Active) badge, heading, description and unlimited sync bar', () => {
    render(<LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" />);
    expect(screen.getByText('Lifetime (Active)')).toBeInTheDocument();
    expect(screen.queryByText('Yours Forever')).not.toBeInTheDocument();
    expect(screen.getByText('Lifetime Account')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('shows the lifetime member-since date and a Verified chip', () => {
    render(<LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" />);
    expect(screen.getByText('Access Status')).toBeInTheDocument();
    expect(screen.getByText('Lifetime member since: Feb 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows the refund deadline beside the sync bar while within the window', () => {
    // ~2026-02-05
    const until = Math.floor(Date.UTC(2026, 1, 5) / 1000);
    render(
      <LifetimePlanCard
        {...baseProps}
        purchasedAt="2026-02-01T00:00:00.000Z"
        refundEligibleUntil={until}
        withinRefundWindow
      />
    );
    expect(screen.getByText('Refund window:')).toBeInTheDocument();
    expect(screen.getByText('until Feb 5, 2026')).toBeInTheDocument();
  });

  it('hides the refund window label once the window has closed', () => {
    render(<LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" />);
    expect(screen.queryByText(/refund window/i)).not.toBeInTheDocument();
  });

  it('falls back gracefully when no purchase date is present', () => {
    render(<LifetimePlanCard {...baseProps} />);
    expect(screen.getByText('Lifetime member')).toBeInTheDocument();
  });

  it('shows only the billing-history link once the refund window has closed', () => {
    render(<LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" />);
    expect(screen.getByRole('button', { name: /billing history/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request a refund/i })).not.toBeInTheDocument();
  });

  it('shows both links while within the refund window and wires them', () => {
    const onBillingHistory = vi.fn();
    const onRefund = vi.fn();
    render(
      <LifetimePlanCard
        {...baseProps}
        purchasedAt="2026-02-01T00:00:00.000Z"
        withinRefundWindow
        onBillingHistory={onBillingHistory}
        onRefund={onRefund}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /billing history/i }));
    fireEvent.click(screen.getByRole('button', { name: /request a refund/i }));
    expect(onBillingHistory).toHaveBeenCalledTimes(1);
    expect(onRefund).toHaveBeenCalledTimes(1);
  });

  it('spins the billing-history link once pressed (but not the instant refund link)', () => {
    const { rerender } = render(
      <LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" withinRefundWindow />
    );
    fireEvent.click(screen.getByRole('button', { name: /billing history/i }));
    rerender(
      <LifetimePlanCard {...baseProps} purchasedAt="2026-02-01T00:00:00.000Z" withinRefundWindow busy />
    );
    expect(screen.getByRole('button', { name: /billing history/i })).toHaveAttribute('aria-busy', 'true');
    // the refund link just opens a dialog - no spinner, no aria-busy
    expect(screen.getByRole('button', { name: /request a refund/i })).not.toHaveAttribute('aria-busy');
  });

  it('shows the refunded confirmation and no links once the refund is processed', () => {
    render(
      <LifetimePlanCard
        {...baseProps}
        purchasedAt="2026-02-01T00:00:00.000Z"
        withinRefundWindow
        refundDone
      />
    );
    expect(screen.getByText(/refunded — your account is now free/i)).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request a refund/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /billing history/i })).not.toBeInTheDocument();
  });
});
