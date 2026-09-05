import Stripe from 'stripe';
import { stripeSecretKey } from './config';

export const STRIPE_API_VERSION = '2024-06-20' as const;

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
  }
  return client;
}
