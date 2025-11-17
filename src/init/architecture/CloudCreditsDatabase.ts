/**
 * Cloud Credits Database
 *
 * Comprehensive database of cloud credit programs for startups
 */

import { CloudCredit } from './types.js';

/**
 * All available cloud credit programs
 */
export const CLOUD_CREDITS_DATABASE: CloudCredit[] = [
  // AWS
  {
    provider: 'AWS Activate (Portfolio)',
    amount: '$1,000',
    duration: '12 months',
    requirements: 'Incubator/accelerator member',
    url: 'https://aws.amazon.com/activate/'
  },
  {
    provider: 'AWS Activate (Portfolio Plus)',
    amount: '$5,000',
    duration: '12 months',
    requirements: 'Select incubators (Y Combinator, Techstars, etc.)',
    url: 'https://aws.amazon.com/activate/'
  },
  {
    provider: 'AWS Activate (Founders)',
    amount: '$100,000',
    duration: '12 months',
    requirements: 'VC-backed Series A+ with AWS customer reference',
    url: 'https://aws.amazon.com/activate/'
  },

  // Azure
  {
    provider: 'Azure for Startups (Standard)',
    amount: '$1,000',
    duration: '90 days',
    requirements: 'Self-service signup',
    url: 'https://azure.microsoft.com/en-us/pricing/member-offers/startups/'
  },
  {
    provider: 'Azure for Startups (Founders Hub)',
    amount: '$100,000',
    duration: '180 days',
    requirements: 'VC-backed startup',
    url: 'https://azure.microsoft.com/en-us/pricing/member-offers/startups/'
  },

  // Google Cloud
  {
    provider: 'Google Cloud for Startups (Standard)',
    amount: '$2,000',
    duration: '24 months',
    requirements: 'Self-service signup',
    url: 'https://cloud.google.com/startup'
  },
  {
    provider: 'Google Cloud for Startups (Startup)',
    amount: '$100,000',
    duration: '24 months',
    requirements: 'VC-backed Series A',
    url: 'https://cloud.google.com/startup'
  },
  {
    provider: 'Google Cloud for Startups (Scale)',
    amount: '$350,000',
    duration: '24 months',
    requirements: 'VC-backed Series B+',
    url: 'https://cloud.google.com/startup'
  },

  // Other providers
  {
    provider: 'Vercel Pro (Free)',
    amount: '$20/month',
    duration: '6 months',
    requirements: 'Startup or open-source project',
    url: 'https://vercel.com/pricing'
  },
  {
    provider: 'Supabase Pro (Free)',
    amount: '$25/month',
    duration: '12 months',
    requirements: 'Early-stage startup',
    url: 'https://supabase.com/pricing'
  },
  {
    provider: 'Stripe Atlas',
    amount: '$5,000 payment processing',
    duration: '12 months',
    requirements: 'Incorporate via Stripe Atlas',
    url: 'https://stripe.com/atlas'
  }
];
