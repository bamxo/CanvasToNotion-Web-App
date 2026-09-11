import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import FreePlanCard from '../components/FreePlanCard';

vi.mock('axios');
vi.mock('../utils/encryption', () => ({ secureGetToken: vi.fn(() => 'tok') }));

beforeEach(() => {
  (axios as any).post = vi.fn();
  Object.defineProperty(window, 'location', { writable: true, value: { href: '' } });
});

afterEach(cleanup);

describe('FreePlanCard', () => {
  it('renders the badge, heading, description and both upgrade options', () => {
    render(<FreePlanCard classSyncUsed={3} classSyncLimit={5} notionConnected={true} />);
    expect(screen.getByText('Free Plan (Active)')).toBeInTheDocument();
    expect(screen.getByText('Standard Tier')).toBeInTheDocument();
    expect(screen.getByText(/upgrade to unlock unlimited sync/i)).toBeInTheDocument();
    expect(screen.getByText('PRO MONTHLY')).toBeInTheDocument();
    expect(screen.getByText('$1')).toBeInTheDocument();
    expect(screen.getByText('Lifetime Pass')).toBeInTheDocument();
    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('POPULAR')).toBeInTheDocument();
  });

  it('shows usage as a fraction, percentage, and remaining count', () => {
    render(<FreePlanCard classSyncUsed={3} classSyncLimit={5} notionConnected={true} />);
    expect(screen.getByText('3 / 5 classes synced (60%)')).toBeInTheDocument();
    expect(screen.getByText(/2 classes remaining/i)).toBeInTheDocument();
  });

  it('singularizes "1 class remaining"', () => {
    render(<FreePlanCard classSyncUsed={4} classSyncLimit={5} notionConnected={true} />);
    expect(screen.getByText(/1 class remaining/i)).toBeInTheDocument();
  });

  it('shows the "connect Notion" state when notionConnected is false', () => {
    render(<FreePlanCard classSyncUsed={0} classSyncLimit={5} notionConnected={false} />);
    expect(
      screen.getByText('Connect Notion to start syncing your classes')
    ).toBeInTheDocument();
    expect(screen.getByText(/Connect your Notion workspace/i)).toBeInTheDocument();
    expect(screen.queryByText(/\/ 5 classes synced/i)).not.toBeInTheDocument();
  });

  it('shows usage counts when notionConnected is true', () => {
    render(<FreePlanCard classSyncUsed={2} classSyncLimit={5} notionConnected={true} />);
    expect(screen.getByText('2 / 5 classes synced (40%)')).toBeInTheDocument();
    expect(screen.getByText(/3 classes remaining/i)).toBeInTheDocument();
  });

  it('clicking Upgrade starts a pro checkout and redirects to the returned url', async () => {
    (axios as any).post.mockResolvedValueOnce({ data: { url: 'https://stripe.test/s/pro' } });
    render(<FreePlanCard classSyncUsed={0} classSyncLimit={5} notionConnected={true} />);

    fireEvent.click(screen.getByRole('button', { name: /upgrade/i }));

    expect((axios as any).post).toHaveBeenCalledWith(
      expect.stringContaining('/billing/checkout'),
      { plan: 'pro' },
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } })
    );
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/s/pro'));
  });

  it('clicking Claim Lifetime Access starts a lifetime checkout and redirects', async () => {
    (axios as any).post.mockResolvedValueOnce({ data: { url: 'https://stripe.test/s/lifetime' } });
    render(<FreePlanCard classSyncUsed={0} classSyncLimit={5} notionConnected={true} />);

    fireEvent.click(screen.getByRole('button', { name: /claim lifetime access/i }));

    expect((axios as any).post).toHaveBeenCalledWith(
      expect.stringContaining('/billing/checkout'),
      { plan: 'lifetime' },
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } })
    );
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/s/lifetime'));
  });

  it('shows an error and does not navigate when checkout fails', async () => {
    (axios as any).post.mockRejectedValueOnce(new Error('network down'));
    render(<FreePlanCard classSyncUsed={0} classSyncLimit={5} notionConnected={true} />);

    fireEvent.click(screen.getByRole('button', { name: /upgrade/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network down/i);
    expect(window.location.href).toBe('');
  });

  it('disables both upgrade buttons while a checkout request is in flight', async () => {
    let resolveFn: (v: unknown) => void = () => {};
    (axios as any).post.mockReturnValueOnce(new Promise((resolve) => { resolveFn = resolve; }));
    render(<FreePlanCard classSyncUsed={0} classSyncLimit={5} notionConnected={true} />);

    fireEvent.click(screen.getByRole('button', { name: /upgrade/i }));

    // the pressed button keeps its accessible name (aria-label) but is disabled
    // and shows a spinner instead of its text label
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /upgrade/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /claim lifetime access/i })).toBeDisabled();

    resolveFn({ data: { url: 'https://stripe.test/s/pro' } });
    await waitFor(() => expect(window.location.href).toBe('https://stripe.test/s/pro'));
  });
});
