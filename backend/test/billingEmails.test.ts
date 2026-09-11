import { describe, beforeEach, afterAll, it, expect, vi } from 'vitest';

// Mock nodemailer so no real email is sent.
const sendMail = vi.fn().mockResolvedValue({});
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
  createTransport: vi.fn(() => ({ sendMail })),
}));

import {
  sendProUpgradeEmail,
  sendLifetimePurchaseEmail,
  sendSubscriptionCanceledEmail,
  sendPaymentFailedEmail,
  sendLifetimeRefundEmail,
} from '../src/utils/billingEmails';

const ORIGINAL_ENV = { ...process.env };

const lastMail = () => sendMail.mock.calls[sendMail.mock.calls.length - 1][0];

describe('billing emails', () => {
  beforeEach(() => {
    sendMail.mockClear();
    sendMail.mockResolvedValue({});
    process.env.GMAIL_USER = 'sender@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('common shell', () => {
    it('sends from the Canvas to Notion address to the recipient with html, text and the inline logo', async () => {
      await sendProUpgradeEmail('user@example.com', {
        amount: '$5.00',
        interval: 'month',
        nextBillingDate: 'March 14, 2026',
        manageUrl: 'https://canvastonotion.io/settings',
      });

      expect(sendMail).toHaveBeenCalledTimes(1);
      const mail = lastMail();
      expect(mail.to).toBe('user@example.com');
      expect(mail.from).toBe('Canvas to Notion <sender@gmail.com>');
      expect(typeof mail.html).toBe('string');
      expect(typeof mail.text).toBe('string');
      expect(mail.attachments).toHaveLength(1);
      expect(mail.attachments[0].cid).toBe('c2n-logo');
    });
  });

  describe('sendProUpgradeEmail', () => {
    it('confirms Pro with the amount, interval and next billing date', async () => {
      await sendProUpgradeEmail('user@example.com', {
        amount: '$5.00',
        interval: 'month',
        nextBillingDate: 'March 14, 2026',
        manageUrl: 'https://canvastonotion.io/settings',
      });
      const mail = lastMail();
      expect(mail.subject).toBe("You're on Canvas to Notion Pro");
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('$5.00');
        expect(body).toContain('month');
        expect(body).toContain('March 14, 2026');
      }
      expect(mail.html).toContain('https://canvastonotion.io/settings');
    });

    it('falls back to pointing at billing settings when the amount/date are unknown', async () => {
      await sendProUpgradeEmail('user@example.com', {
        manageUrl: 'https://canvastonotion.io/settings',
      });
      const mail = lastMail();
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('billing settings');
        expect(body).not.toContain('undefined');
        expect(body).not.toContain('null');
      }
    });
  });

  describe('sendLifetimePurchaseEmail', () => {
    it('confirms Lifetime with the amount and the refund-window end date', async () => {
      await sendLifetimePurchaseEmail('user@example.com', {
        amount: '$10.00',
        refundEligibleUntil: 'March 21, 2026',
        manageUrl: 'https://canvastonotion.io/settings',
      });
      const mail = lastMail();
      expect(mail.subject).toBe('Your Canvas to Notion Lifetime access');
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('$10.00');
        expect(body).toContain('March 21, 2026');
      }
    });
  });

  describe('sendSubscriptionCanceledEmail', () => {
    it('confirms the cancellation, when access ends and that they can resubscribe', async () => {
      await sendSubscriptionCanceledEmail('user@example.com', {
        accessUntil: 'April 1, 2026',
        resubscribeUrl: 'https://canvastonotion.io/settings',
      });
      const mail = lastMail();
      expect(mail.subject).toBe('Your Pro subscription is canceled');
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('April 1, 2026');
        expect(body.toLowerCase()).toContain('resubscribe');
      }
      expect(mail.html).toContain('https://canvastonotion.io/settings');
    });
  });

  describe('sendPaymentFailedEmail', () => {
    it('warns the card failed and gives the grace-period end date and a way to update the card', async () => {
      await sendPaymentFailedEmail('user@example.com', {
        accessUntil: 'April 1, 2026',
        updatePaymentUrl: 'https://canvastonotion.io/settings',
      });
      const mail = lastMail();
      expect(mail.subject).toBe('Payment failed — update your card to keep Pro');
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('April 1, 2026');
      }
      expect(mail.html).toContain('https://canvastonotion.io/settings');
    });
  });

  describe('sendLifetimeRefundEmail', () => {
    it('confirms the refund amount is processing and names the new plan', async () => {
      await sendLifetimeRefundEmail('user@example.com', {
        amount: '$10.00',
        newTier: 'free',
      });
      const mail = lastMail();
      expect(mail.subject).toBe('Your Canvas to Notion refund is on its way');
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain('$10.00');
        expect(body.toLowerCase()).toContain('free');
      }
    });

    it('names Pro as the new plan when the subscription is still live', async () => {
      await sendLifetimeRefundEmail('user@example.com', {
        amount: '$10.00',
        newTier: 'pro',
      });
      const mail = lastMail();
      for (const body of [mail.html, mail.text]) {
        expect(body.toLowerCase()).toContain('pro');
      }
    });
  });

  it('propagates a transport failure to the caller', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      sendLifetimeRefundEmail('user@example.com', { amount: '$10.00', newTier: 'free' })
    ).rejects.toThrow('smtp down');
  });
});
