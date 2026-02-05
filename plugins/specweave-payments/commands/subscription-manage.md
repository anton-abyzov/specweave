---
description: Generate a complete subscription management system with pricing tiers, billing, upgrades, cancellations, and usage tracking
---

# Subscription Management

Generate complete subscription management system.

## Task

You are a subscription billing expert. Generate production-ready subscription management with billing, upgrades, and cancellations.

### Steps:

1. **Ask for Requirements**:
   - Pricing tiers (Basic, Pro, Enterprise)
   - Billing interval (monthly, annual)
   - Features per tier
   - Trial period

2. **Generate Pricing Configuration**:

```typescript
// config/pricing.ts
export const PRICING_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'For individuals and small teams',
    prices: {
      monthly: {
        amount: 9,
        stripePriceId: 'price_basic_monthly',
      },
      annual: {
        amount: 90,
        stripePriceId: 'price_basic_annual',
        savings: 18, // 2 months free
      },
    },
    features: [
      '10 projects',
      '5 GB storage',
      'Basic support',
    ],
    limits: {
      projects: 10,
      storage: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
      apiCallsPerMonth: 10000,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    prices: {
      monthly: {
        amount: 29,
        stripePriceId: 'price_pro_monthly',
      },
      annual: {
        amount: 290,
        stripePriceId: 'price_pro_annual',
        savings: 58,
      },
    },
    features: [
      'Unlimited projects',
      '50 GB storage',
      'Priority support',
      'Advanced analytics',
    ],
    limits: {
      projects: Infinity,
      storage: 50 * 1024 * 1024 * 1024,
      apiCallsPerMonth: 100000,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    prices: {
      monthly: {
        amount: 99,
        stripePriceId: 'price_enterprise_monthly',
      },
      annual: {
        amount: 990,
        stripePriceId: 'price_enterprise_annual',
        savings: 198,
      },
    },
    features: [
      'Unlimited everything',
      '1 TB storage',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: {
      projects: Infinity,
      storage: 1024 * 1024 * 1024 * 1024,
      apiCallsPerMonth: Infinity,
    },
  },
};
```

3. **Generate Subscription Service**:

```typescript
// services/subscription.service.ts
import Stripe from 'stripe';
import { PRICING_PLANS } from '../config/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class SubscriptionService {
  // Create subscription
  async create(userId: string, planId: string, interval: 'monthly' | 'annual') {
    const user = await db.users.findUnique({ where: { id: userId } });
    const plan = PRICING_PLANS[planId];

    if (!plan) throw new Error('Invalid plan');

    // Create Stripe customer if doesn't exist
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.users.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.prices[interval].stripePriceId }],
      trial_period_days: 14, // 14-day trial
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Save to database
    await db.subscriptions.create({
      data: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: plan.prices[interval].stripePriceId,
        status: subscription.status,
        planId,
        interval,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
      },
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    };
  }

  // Upgrade/downgrade subscription
  async changePlan(userId: string, newPlanId: string, newInterval: 'monthly' | 'annual') {
    const subscription = await db.subscriptions.findFirst({
      where: { userId, status: 'active' },
    });

    if (!subscription) throw new Error('No active subscription');

    const newPlan = PRICING_PLANS[newPlanId];
    const newPriceId = newPlan.prices[newInterval].stripePriceId;

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice', // Prorate charges
      }
    );

    // Update database
    await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        stripePriceId: newPriceId,
        planId: newPlanId,
        interval: newInterval,
      },
    });

    return updatedSubscription;
  }

  // Cancel subscription
  async cancel(userId: string, cancelAtPeriodEnd = true) {
    const subscription = await db.subscriptions.findFirst({
      where: { userId, status: 'active' },
    });

    if (!subscription) throw new Error('No active subscription');

    if (cancelAtPeriodEnd) {
      // Cancel at end of billing period
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db.subscriptions.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await db.subscriptions.update({
        where: { id: subscription.id },
        data: { status: 'canceled', canceledAt: new Date() },
      });
    }
  }

  // Resume canceled subscription
  async resume(userId: string) {
    const subscription = await db.subscriptions.findFirst({
      where: { userId, cancelAtPeriodEnd: true },
    });

    if (!subscription) throw new Error('No subscription to resume');

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db.subscriptions.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false },
    });
  }

  // Get subscription status
  async getStatus(userId: string) {
    const subscription = await db.subscriptions.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) return null;

    const plan = PRICING_PLANS[subscription.planId];
    return {
      ...subscription,
      plan,
      isActive: subscription.status === 'active',
      isTrialing: subscription.status === 'trialing',
      isCanceling: subscription.cancelAtPeriodEnd,
    };
  }

  // Check feature access
  async canAccess(userId: string, feature: string, value?: number) {
    const status = await this.getStatus(userId);

    if (!status || !status.isActive) return false;

    const limits = status.plan.limits;

    // Check specific limits
    switch (feature) {
      case 'projects':
        const projectCount = await db.projects.count({ where: { userId } });
        return projectCount < limits.projects;

      case 'storage':
        const storageUsed = await this.getStorageUsage(userId);
        return storageUsed < limits.storage;

      case 'api_calls':
        const apiCalls = await this.getApiCallsThisMonth(userId);
        return apiCalls < limits.apiCallsPerMonth;

      default:
        return false;
    }
  }
}
```

4. **Generate Usage Tracking**:

```typescript
// Track API usage for metered billing
export class UsageTracker {
  async recordApiCall(userId: string) {
    const subscription = await db.subscriptions.findFirst({
      where: { userId, status: 'active' },
    });

    if (!subscription) return;

    // Increment usage
    await db.usageRecords.create({
      data: {
        subscriptionId: subscription.id,
        type: 'api_call',
        quantity: 1,
        timestamp: new Date(),
      },
    });

    // Optional: Report to Stripe for metered billing
    if (subscription.meteringEnabled) {
      await stripe.subscriptionItems.createUsageRecord(
        subscription.stripeSubscriptionItemId,
        {
          quantity: 1,
          timestamp: Math.floor(Date.now() / 1000),
        }
      );
    }
  }

  async getUsage(userId: string, period: 'month' | 'all' = 'month') {
    const subscription = await db.subscriptions.findFirst({
      where: { userId },
    });

    if (!subscription) return null;

    const startDate =
      period === 'month'
        ? new Date(new Date().setDate(1)) // Start of month
        : undefined;

    const usage = await db.usageRecords.groupBy({
      by: ['type'],
      where: {
        subscriptionId: subscription.id,
        timestamp: startDate ? { gte: startDate } : undefined,
      },
      _sum: {
        quantity: true,
      },
    });

    return usage;
  }
}
```

### Best Practices Included:

- Trial periods
- Proration on plan changes
- Cancel at period end vs immediate
- Usage tracking for metered billing
- Feature gating based on plan
- Subscription resumption
- Clear pricing configuration

### Example Usage:

```
User: "Set up subscription with Basic, Pro, Enterprise tiers"
Result: Complete subscription system with billing, upgrades, trials
```
