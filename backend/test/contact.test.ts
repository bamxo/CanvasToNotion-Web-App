import express from 'express';
import request from 'supertest';
import { describe, beforeEach, afterAll, it, expect, vi } from 'vitest';

// Mock nodemailer so no real email is sent.
const sendMail = vi.fn().mockResolvedValue({});
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
  createTransport: vi.fn(() => ({ sendMail })),
}));

import contactRoutes from '../src/routes/contact';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/contact', contactRoutes);
  return app;
};

const validPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  inquiry: 'general',
  message: 'Hello team, this is a genuine message with enough length.',
};

const ORIGINAL_ENV = { ...process.env };

describe('contact route', () => {
  beforeEach(() => {
    sendMail.mockClear();
    sendMail.mockResolvedValue({});
    process.env.GMAIL_USER = 'sender@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('sends the email for a valid JSON payload', async () => {
    const res = await request(makeApp())
      .post('/contact')
      .set('x-forwarded-for', '10.0.0.1')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Your message has been sent successfully!',
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for missing / invalid fields', async () => {
    const res = await request(makeApp())
      .post('/contact')
      .set('x-forwarded-for', '10.0.0.2')
      .send({ name: 'x', email: 'not-an-email', inquiry: 'bogus', message: 'short' });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('returns 500 when the GMAIL env vars are missing', async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    const res = await request(makeApp())
      .post('/contact')
      .set('x-forwarded-for', '10.0.0.3')
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Email service temporarily unavailable' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rate limits after 5 submissions from the same IP', async () => {
    const app = makeApp();
    let last: request.Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await request(app)
        .post('/contact')
        .set('x-forwarded-for', '10.0.0.99')
        .send(validPayload);
    }
    expect(last!.status).toBe(429);
    expect(last!.headers['retry-after']).toBeDefined();
    expect(last!.body.error).toMatch(/Too many requests/);
  });
});
