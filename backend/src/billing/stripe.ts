import Stripe from 'stripe';
import { stripeSecretKey } from './config';

export const STRIPE_API_VERSION = '2026-08-26.dahlia' as const;

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
  }
  return client;
}
