---
description: Implement complete subscription billing with pricing tiers, trials, upgrades/downgrades, proration, and lifecycle management
---

# /sw-payments:subscription-flow

Complete subscription billing implementation guide with pricing tiers, trials, upgrades/downgrades, and lifecycle management.

You are a subscription billing expert who designs and implements SaaS recurring revenue systems.

## Your Task

Implement complete subscription billing with multiple tiers, trial periods, proration, cancellation handling, and customer portal.

### 1. Subscription Architecture

**Subscription Components**:

```
Product (e.g., "Pro Plan")
  ├─ Price (Monthly: $29)
  ├─ Price (Yearly: $290, 16% discount)
  └─ Features (API access, 10 users, Priority support)

Customer
  ├─ Subscription (Active)
  │   ├─ Items (Price ID, Quantity)
  │   ├─ Current Period (Start/End)
  │   └─ Payment Method (Card)
  └─ Invoices (History)
```

**Subscription States**:
```
trialing → active → past_due → canceled
                  ↓
                paused → resumed
                  ↓
              incomplete → incomplete_expired
```

### 2. Product and Pricing Setup

**Define Pricing Tiers**:

```typescript
// src/config/subscription-plans.ts
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
  prices: {
    monthly: number; // in cents
    yearly: number;
  };
  limits: {
    users?: number;
    apiCalls?: number;
    storage?: number; // in GB
  };
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out our service',
    features: [
      'Up to 2 users',
      '1,000 API calls/month',
      '1 GB storage',
      'Community support',
    ],
    stripePriceIds: {
      monthly: '', // No Stripe price for free tier
      yearly: '',
    },
    prices: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      users: 2,
      apiCalls: 1000,
      storage: 1,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Great for small teams getting started',
    features: [
      'Up to 5 users',
      '10,000 API calls/month',
      '10 GB storage',
      'Email support',
      'Basic analytics',
    ],
    stripePriceIds: {
      monthly: 'price_starter_monthly_xxx',
      yearly: 'price_starter_yearly_xxx',
    },
    prices: {
      monthly: 2900, // $29
      yearly: 29000, // $290 (16% discount)
    },
    limits: {
      users: 5,
      apiCalls: 10000,
      storage: 10,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams with advanced needs',
    features: [
      'Up to 20 users',
      '100,000 API calls/month',
      '100 GB storage',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    stripePriceIds: {
      monthly: 'price_pro_monthly_xxx',
      yearly: 'price_pro_yearly_xxx',
    },
    prices: {
      monthly: 9900, // $99
      yearly: 99000, // $990 (16% discount)
    },
    limits: {
      users: 20,
      apiCalls: 100000,
      storage: 100,
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    features: [
      'Unlimited users',
      'Unlimited API calls',
      'Unlimited storage',
      'Dedicated support',
      'SLA guarantees',
      'Custom contracts',
      'On-premise deployment',
    ],
    stripePriceIds: {
      monthly: 'price_enterprise_monthly_xxx',
      yearly: 'price_enterprise_yearly_xxx',
    },
    prices: {
      monthly: 49900, // $499
      yearly: 499000, // $4,990 (16% discount)
    },
    limits: {
      users: undefined, // unlimited
      apiCalls: undefined,
      storage: undefined,
    },
  },
];

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(
    (plan) =>
      plan.stripePriceIds.monthly === priceId ||
      plan.stripePriceIds.yearly === priceId
  );
}
```

### 3. Subscription Service

**Subscription Management**:

```typescript
// src/services/subscription.service.ts
import { stripe } from '../config/stripe';
import type Stripe from 'stripe';
import { getPlanById } from '../config/subscription-plans';

export class SubscriptionService {
  /**
   * Create a subscription with trial period
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialDays?: number;
    quantity?: number;
    couponId?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: params.metadata,
      };

      // Add trial period if specified
      if (params.trialDays && params.trialDays > 0) {
        subscriptionParams.trial_period_days = params.trialDays;
      }

      // Add coupon if specified
      if (params.couponId) {
        subscriptionParams.coupon = params.couponId;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Subscription creation failed');
    }
  }

  /**
   * Create subscription with checkout session
   */
  async createSubscriptionCheckout(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    trialDays?: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
      };

      // Customer reference
      if (params.customerId) {
        sessionParams.customer = params.customerId;
      } else if (params.customerEmail) {
        sessionParams.customer_email = params.customerEmail;
      }

      // Trial period
      if (params.trialDays && params.trialDays > 0) {
        sessionParams.subscription_data = {
          trial_period_days: params.trialDays,
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return session;
    } catch (error) {
      console.error('Failed to create subscription checkout:', error);
      throw new Error('Checkout creation failed');
    }
  }

  /**
   * Retrieve subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method', 'latest_invoice'],
      });
    } catch (error) {
      console.error('Failed to retrieve subscription:', error);
      throw new Error('Subscription retrieval failed');
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(params: {
    subscriptionId: string;
    newPriceId: string;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    quantity?: number;
  }): Promise<Stripe.Subscription> {
    try {
      // Get current subscription
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);

      // Update subscription
      const updated = await stripe.subscriptions.update(params.subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: params.newPriceId,
            quantity: params.quantity,
          },
        ],
        proration_behavior: params.prorationBehavior || 'create_prorations',
      });

      return updated;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw new Error('Subscription update failed');
    }
  }

  /**
   * Cancel subscription (immediate or at period end)
   */
  async cancelSubscription(params: {
    subscriptionId: string;
    immediately?: boolean;
    cancellationReason?: string;
  }): Promise<Stripe.Subscription> {
    try {
      if (params.immediately) {
        // Cancel immediately
        return await stripe.subscriptions.cancel(params.subscriptionId, {
          cancellation_details: {
            comment: params.cancellationReason,
          },
        });
      } else {
        // Cancel at period end
        return await stripe.subscriptions.update(params.subscriptionId, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: params.cancellationReason,
          },
        });
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Subscription cancellation failed');
    }
  }

  /**
   * Resume a canceled subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      throw new Error('Subscription resume failed');
    }
  }

  /**
   * Pause subscription
   */
  async pauseSubscription(params: {
    subscriptionId: string;
    resumeAt?: number; // Unix timestamp
  }): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(params.subscriptionId, {
        pause_collection: {
          behavior: 'void',
          resumes_at: params.resumeAt,
        },
      });
    } catch (error) {
      console.error('Failed to pause subscription:', error);
      throw new Error('Subscription pause failed');
    }
  }

  /**
   * Resume paused subscription
   */
  async unpauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        pause_collection: null as any,
      });
    } catch (error) {
      console.error('Failed to unpause subscription:', error);
      throw new Error('Subscription unpause failed');
    }
  }

  /**
   * List customer subscriptions
   */
  async listCustomerSubscriptions(
    customerId: string
  ): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });

      return subscriptions.data;
    } catch (error) {
      console.error('Failed to list subscriptions:', error);
      throw new Error('Subscription listing failed');
    }
  }

  /**
   * Get upcoming invoice (preview charges)
   */
  async getUpcomingInvoice(params: {
    customerId: string;
    subscriptionId: string;
    newPriceId?: string;
  }): Promise<Stripe.Invoice> {
    try {
      const invoiceParams: Stripe.InvoiceRetrieveUpcomingParams = {
        customer: params.customerId,
        subscription: params.subscriptionId,
      };

      // Preview plan change
      if (params.newPriceId) {
        const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
        invoiceParams.subscription_items = [
          {
            id: subscription.items.data[0].id,
            price: params.newPriceId,
          },
        ];
      }

      return await stripe.invoices.retrieveUpcoming(invoiceParams);
    } catch (error) {
      console.error('Failed to retrieve upcoming invoice:', error);
      throw new Error('Invoice preview failed');
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    try {
      return await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error('Portal session creation failed');
    }
  }

  /**
   * Apply coupon to subscription
   */
  async applyCoupon(
    subscriptionId: string,
    couponId: string
  ): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        coupon: couponId,
      });
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      throw new Error('Coupon application failed');
    }
  }

  /**
   * Remove coupon from subscription
   */
  async removeCoupon(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        coupon: '',
      });
    } catch (error) {
      console.error('Failed to remove coupon:', error);
      throw new Error('Coupon removal failed');
    }
  }
}

export const subscriptionService = new SubscriptionService();
```

### 4. API Routes

**Subscription Endpoints**:

```typescript
// src/routes/subscription.routes.ts
import { Router, Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';

const router = Router();

/**
 * POST /api/subscriptions
 * Create a subscription
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, trialDays, quantity, couponId, metadata } = req.body;

    if (!customerId || !priceId) {
      return res.status(400).json({ error: 'Customer ID and Price ID required' });
    }

    const subscription = await subscriptionService.createSubscription({
      customerId,
      priceId,
      trialDays,
      quantity,
      couponId,
      metadata,
    });

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent
        ?.client_secret,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create subscription checkout session
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { customerId, customerEmail, priceId, trialDays, metadata } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID required' });
    }

    const session = await subscriptionService.createSubscriptionCheckout({
      customerId,
      customerEmail,
      priceId,
      trialDays,
      successUrl: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${req.headers.origin}/subscription/cancel`,
      metadata,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get subscription details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.getSubscription(req.params.id);
    res.json(subscription);
  } catch (error) {
    console.error('Subscription retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription' });
  }
});

/**
 * PATCH /api/subscriptions/:id
 * Update subscription (upgrade/downgrade)
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { newPriceId, quantity, prorationBehavior } = req.body;

    if (!newPriceId) {
      return res.status(400).json({ error: 'New price ID required' });
    }

    const subscription = await subscriptionService.updateSubscription({
      subscriptionId: req.params.id,
      newPriceId,
      quantity,
      prorationBehavior,
    });

    res.json(subscription);
  } catch (error) {
    console.error('Subscription update error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Cancel subscription
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { immediately, reason } = req.body;

    const subscription = await subscriptionService.cancelSubscription({
      subscriptionId: req.params.id,
      immediately,
      cancellationReason: reason,
    });

    res.json(subscription);
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscriptions/:id/resume
 * Resume canceled subscription
 */
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.resumeSubscription(req.params.id);
    res.json(subscription);
  } catch (error) {
    console.error('Subscription resume error:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

/**
 * POST /api/subscriptions/:id/pause
 * Pause subscription
 */
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { resumeAt } = req.body;

    const subscription = await subscriptionService.pauseSubscription({
      subscriptionId: req.params.id,
      resumeAt,
    });

    res.json(subscription);
  } catch (error) {
    console.error('Subscription pause error:', error);
    res.status(500).json({ error: 'Failed to pause subscription' });
  }
});

/**
 * POST /api/subscriptions/:id/unpause
 * Resume paused subscription
 */
router.post('/:id/unpause', async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.unpauseSubscription(req.params.id);
    res.json(subscription);
  } catch (error) {
    console.error('Subscription unpause error:', error);
    res.status(500).json({ error: 'Failed to unpause subscription' });
  }
});

/**
 * GET /api/subscriptions/customer/:customerId
 * List customer subscriptions
 */
router.get('/customer/:customerId', async (req: Request, res: Response) => {
  try {
    const subscriptions = await subscriptionService.listCustomerSubscriptions(
      req.params.customerId
    );
    res.json(subscriptions);
  } catch (error) {
    console.error('Subscription listing error:', error);
    res.status(500).json({ error: 'Failed to list subscriptions' });
  }
});

/**
 * GET /api/subscriptions/:id/upcoming-invoice
 * Preview upcoming invoice
 */
router.get('/:id/upcoming-invoice', async (req: Request, res: Response) => {
  try {
    const { customerId, newPriceId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const invoice = await subscriptionService.getUpcomingInvoice({
      customerId: customerId as string,
      subscriptionId: req.params.id,
      newPriceId: newPriceId as string,
    });

    res.json(invoice);
  } catch (error) {
    console.error('Invoice preview error:', error);
    res.status(500).json({ error: 'Failed to preview invoice' });
  }
});

/**
 * POST /api/subscriptions/portal
 * Create customer portal session
 */
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const session = await subscriptionService.createPortalSession({
      customerId,
      returnUrl: `${req.headers.origin}/account`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * POST /api/subscriptions/:id/coupon
 * Apply coupon to subscription
 */
router.post('/:id/coupon', async (req: Request, res: Response) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json({ error: 'Coupon ID required' });
    }

    const subscription = await subscriptionService.applyCoupon(
      req.params.id,
      couponId
    );

    res.json(subscription);
  } catch (error) {
    console.error('Coupon application error:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

/**
 * DELETE /api/subscriptions/:id/coupon
 * Remove coupon from subscription
 */
router.delete('/:id/coupon', async (req: Request, res: Response) => {
  try {
    const subscription = await subscriptionService.removeCoupon(req.params.id);
    res.json(subscription);
  } catch (error) {
    console.error('Coupon removal error:', error);
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
});

export default router;
```

### 5. Frontend Components

**Pricing Table**:

```typescript
// src/components/PricingTable.tsx
import React from 'react';
import { SUBSCRIPTION_PLANS } from '../config/subscription-plans';

interface PricingTableProps {
  billingCycle: 'monthly' | 'yearly';
  onSelectPlan: (planId: string, priceId: string) => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  billingCycle,
  onSelectPlan,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`
            relative border rounded-lg p-6 flex flex-col
            ${plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
          `}
        >
          {plan.popular && (
            <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg">
              Popular
            </span>
          )}

          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
          <p className="mt-2 text-gray-600 text-sm">{plan.description}</p>

          <div className="mt-6">
            <span className="text-4xl font-bold text-gray-900">
              ${plan.prices[billingCycle] / 100}
            </span>
            <span className="text-gray-600">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
            {billingCycle === 'yearly' && plan.prices.yearly > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Save ${(plan.prices.monthly * 12 - plan.prices.yearly) / 100}/year
              </p>
            )}
          </div>

          <ul className="mt-6 space-y-3 flex-grow">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() =>
              onSelectPlan(plan.id, plan.stripePriceIds[billingCycle])
            }
            disabled={plan.id === 'free'}
            className={`
              mt-6 w-full py-3 px-4 rounded-lg font-medium transition-colors
              ${
                plan.popular
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }
              ${plan.id === 'free' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {plan.id === 'free' ? 'Current Plan' : 'Get Started'}
          </button>
        </div>
      ))}
    </div>
  );
};
```

**Subscription Management**:

```typescript
// src/components/SubscriptionManager.tsx
import React, { useState, useEffect } from 'react';
import type Stripe from 'stripe';

interface SubscriptionManagerProps {
  customerId: string;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  customerId,
}) => {
  const [subscriptions, setSubscriptions] = useState<Stripe.Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, [customerId]);

  const loadSubscriptions = async () => {
    try {
      const response = await fetch(`/api/subscriptions/customer/${customerId}`);
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false }),
      });

      await loadSubscriptions();
      alert('Subscription will be canceled at the end of the billing period');
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
      });

      await loadSubscriptions();
      alert('Subscription resumed successfully');
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      alert('Failed to resume subscription');
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal');
    }
  };

  if (loading) {
    return <div>Loading subscriptions...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Subscriptions</h2>
        <button
          onClick={handleManageBilling}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Manage Billing
        </button>
      </div>

      <div className="space-y-4">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {subscription.items.data[0].price.product as string}
                </h3>
                <p className="text-gray-600 mt-1">
                  ${subscription.items.data[0].price.unit_amount! / 100}/
                  {subscription.items.data[0].price.recurring?.interval}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Status:{' '}
                  <span
                    className={`
                    font-medium
                    ${subscription.status === 'active' ? 'text-green-600' : ''}
                    ${subscription.status === 'trialing' ? 'text-blue-600' : ''}
                    ${subscription.status === 'past_due' ? 'text-red-600' : ''}
                  `}
                  >
                    {subscription.status}
                  </span>
                </p>
                {subscription.cancel_at_period_end && (
                  <p className="text-sm text-orange-600 mt-1">
                    Cancels on{' '}
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {subscription.cancel_at_period_end ? (
                  <button
                    onClick={() => handleResumeSubscription(subscription.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={() => handleCancelSubscription(subscription.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {subscriptions.length === 0 && (
          <p className="text-gray-600 text-center py-8">
            You don't have any active subscriptions
          </p>
        )}
      </div>
    </div>
  );
};
```

### 6. Webhook Handling

**Subscription Events**:

```typescript
// src/webhooks/subscription.webhook.ts
import type Stripe from 'stripe';

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription created:', subscription.id);

  // Update database
  // await db.subscriptions.create({
  //   stripeSubscriptionId: subscription.id,
  //   customerId: subscription.customer,
  //   status: subscription.status,
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });

  // Send welcome email
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription updated:', subscription.id);

  // Update database
  // await db.subscriptions.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: {
  //     status: subscription.status,
  //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  //   },
  // });

  // Handle status changes
  if (subscription.status === 'past_due') {
    // Send payment failed email
  }
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription deleted:', subscription.id);

  // Update database
  // await db.subscriptions.update({
  //   where: { stripeSubscriptionId: subscription.id },
  //   data: {
  //     status: 'canceled',
  //     canceledAt: new Date(),
  //   },
  // });

  // Revoke access
  // Send cancellation confirmation email
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Invoice payment succeeded:', invoice.id);

  // Record payment
  // Send receipt
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Invoice payment failed:', invoice.id);

  // Send payment failed notification
  // Implement dunning management
}
```

## Output Deliverables

When you complete this implementation, provide:

1. **Configuration**:
   - Subscription plans with pricing tiers
   - Stripe product and price IDs
   - Trial period settings

2. **Backend Services**:
   - Subscription service with all operations
   - API routes for subscription management
   - Webhook handlers for subscription events

3. **Frontend Components**:
   - Pricing table with plan comparison
   - Subscription management dashboard
   - Plan upgrade/downgrade UI

4. **Documentation**:
   - Subscription lifecycle diagram
   - Upgrade/downgrade flow
   - Proration explanation
   - Cancellation policy

5. **Testing**:
   - Subscription creation tests
   - Plan change tests
   - Cancellation tests
   - Trial period tests

## Best Practices

1. **Always use proration** for mid-cycle changes
2. **Implement trials** to reduce friction
3. **Allow cancellation at period end** (not immediately)
4. **Use customer portal** for self-service
5. **Send clear email notifications** for all subscription events
6. **Handle failed payments gracefully** with retry logic
7. **Preview charges** before plan changes
8. **Track subscription metrics** (MRR, churn, LTV)
9. **Offer annual discounts** to improve retention
10. **Make downgrades easy** to reduce immediate cancellations

Subscriptions are the foundation of SaaS revenue. Implement them robustly with clear communication and excellent UX.
