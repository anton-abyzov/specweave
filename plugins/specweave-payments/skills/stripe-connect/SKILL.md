---
name: stripe-connect
description: Stripe Connect integration for marketplaces and platform payments with Direct Charge and Destination Charge patterns. Use when building marketplaces with seller payouts, implementing platform fees, or onboarding vendors to receive payments. Covers Connect webhook setup, account verification, and the critical Direct Charge webhook gap.
---

# Stripe Connect Integration

Master Stripe Connect for marketplace and platform payments with proper webhook handling, charge patterns, and Connect account management.

## When to Use This Skill

- Building a marketplace where sellers receive payments
- Implementing platform payments with fees
- Onboarding vendors/sellers to your platform
- Setting up multi-party payment flows
- Handling payouts to connected accounts
- Managing Connect webhooks (especially for Direct Charge!)

## ⚠️ Critical: Charge Type Selection

| Pattern | Who Creates Charge | Webhook Location | Best For |
|---------|-------------------|------------------|----------|
| **Direct Charge** | Connected Account | Connect endpoint | Marketplaces where seller owns customer relationship |
| **Destination Charge** | Platform | Platform endpoint | Platform controls experience, takes fee |
| **Separate Charges & Transfers** | Platform | Platform endpoint | Maximum flexibility, complex splits |

### The #1 Connect Gotcha: Direct Charge Webhook Gap

**When using Direct Charge, checkout sessions are created ON the Connected Account, NOT the platform!**

```
❌ Platform webhook only - PAYMENTS WILL BE MISSED!
   /webhooks/stripe → Does NOT receive Direct Charge checkout.session.completed

✅ Both webhooks required:
   /webhooks/stripe         → Platform events (account.updated, etc.)
   /webhooks/stripe/connect → checkout.session.completed for Direct Charges!
```

## Quick Start: Direct Charge with Correct Webhooks

### 1. Create Checkout Session (Direct Charge)

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createDirectChargeCheckout(
  connectedAccountId: string,
  amount: number,
  platformFee: number,
  metadata: Record<string, string>
) {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Service Booking' },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFee, // Platform takes this
        metadata,
      },
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cancel`,
      metadata,
    },
    {
      stripeAccount: connectedAccountId, // CRITICAL: Creates on connected account!
    }
  );

  return session;
}
```

### 2. Platform Webhook Endpoint

```typescript
// /webhooks/stripe - Platform events only
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      // Note: checkout.session.completed does NOT come here for Direct Charge!
    }

    res.json({ received: true });
  }
);
```

### 3. Connect Webhook Endpoint (CRITICAL for Direct Charge!)

```typescript
// /webhooks/stripe/connect - Connected account events
app.post('/webhooks/stripe/connect',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET! // Different secret!
    );

    const connectedAccountId = event.account;

    switch (event.type) {
      case 'checkout.session.completed':
        // THIS is where Direct Charge payments complete!
        await handleConnectCheckoutComplete(event.data.object, connectedAccountId);
        break;

      case 'checkout.session.expired':
        await handleConnectCheckoutExpired(event.data.object, connectedAccountId);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object, connectedAccountId);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object, connectedAccountId);
        break;
    }

    res.json({ received: true });
  }
);

async function handleConnectCheckoutComplete(
  session: Stripe.Checkout.Session,
  connectedAccountId: string
) {
  // Retrieve full session from the connected account
  const fullSession = await stripe.checkout.sessions.retrieve(
    session.id,
    { expand: ['line_items', 'payment_intent'] },
    { stripeAccount: connectedAccountId } // CRITICAL!
  );

  // Idempotent confirmation
  await confirmPayment(fullSession.id);
}
```

### 4. Stripe Dashboard Setup

1. **Platform webhook**: Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/webhooks/stripe`
   - Select: "Account" events
   - Events: `account.updated`

2. **Connect webhook**: Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/webhooks/stripe/connect`
   - Select: "Connected accounts" (NOT "Account"!)
   - Events: `checkout.session.completed`, `checkout.session.expired`, `payout.paid`, `payout.failed`

## Account Onboarding

### Express Account (Recommended for Most Cases)

```typescript
async function createConnectAccount(email: string, businessType: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    business_type: businessType,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      internal_user_id: 'user_123',
    },
  });

  return account;
}

async function createOnboardingLink(accountId: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.APP_URL}/onboarding/refresh`,
    return_url: `${process.env.APP_URL}/onboarding/complete`,
    type: 'account_onboarding',
  });

  return accountLink.url; // Redirect user here
}
```

### Checking Account Status

```typescript
async function isAccountReady(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);

  return (
    account.charges_enabled &&
    account.payouts_enabled &&
    !account.requirements?.currently_due?.length
  );
}
```

## Destination Charge Pattern

Use when platform controls the customer relationship:

```typescript
async function createDestinationCharge(
  amount: number,
  destinationAccountId: string,
  platformFee: number
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    transfer_data: {
      destination: destinationAccountId,
    },
    application_fee_amount: platformFee,
    metadata: {
      booking_id: 'booking_123',
    },
  });

  return paymentIntent;
}
```

## Separate Charges & Transfers

For maximum flexibility (e.g., split payments to multiple sellers):

```typescript
async function chargeAndTransfer(
  amount: number,
  transfers: Array<{ accountId: string; amount: number }>
) {
  // 1. Create charge on platform
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: { type: 'multi_transfer' },
  });

  // 2. After payment succeeds, create transfers
  // (Usually in webhook handler)
  for (const transfer of transfers) {
    await stripe.transfers.create({
      amount: transfer.amount,
      currency: 'usd',
      destination: transfer.accountId,
      source_transaction: paymentIntent.latest_charge as string,
    });
  }
}
```

## Handling Refunds with Connect

```typescript
async function refundDirectCharge(
  paymentIntentId: string,
  connectedAccountId: string,
  refundApplicationFee: boolean = false
) {
  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      refund_application_fee: refundApplicationFee, // Return platform fee too?
    },
    {
      stripeAccount: connectedAccountId, // CRITICAL for Direct Charge!
    }
  );

  return refund;
}
```

## Pre-Implementation Checklist

### Webhook Setup
- [ ] Platform webhook configured for `account.updated`
- [ ] Connect webhook configured for `checkout.session.completed`
- [ ] Connect webhook configured for `checkout.session.expired`
- [ ] Connect webhook configured for `payout.paid`, `payout.failed`
- [ ] Two different webhook secrets stored in env vars
- [ ] Stripe Dashboard shows "Connected accounts" for Connect webhook

### Account Onboarding
- [ ] Account creation flow with proper type (Express/Standard/Custom)
- [ ] Onboarding link generation
- [ ] Return/refresh URL handling
- [ ] Account status checking before allowing charges

### Charge Flow
- [ ] Decided on charge pattern (Direct/Destination/Separate)
- [ ] Platform fee calculation implemented
- [ ] Idempotent payment confirmation
- [ ] 100% promo code handling (if applicable)

### Testing
- [ ] Test onboarding with test account
- [ ] Test checkout with Stripe CLI forwarding
- [ ] Test Connect webhook receives `checkout.session.completed`
- [ ] Test refund flow
- [ ] Test payout events

## Common Mistakes

1. **Missing Connect webhook for Direct Charge** - #1 cause of "payments not working"
2. **Same webhook secret for both endpoints** - They MUST be different
3. **Not specifying stripeAccount when retrieving session** - Gets wrong data
4. **Assuming account is ready without checking** - Always verify `charges_enabled`
5. **Hardcoding platform fee** - Should be configurable per transaction

## Resources

- [Stripe Connect Overview](https://stripe.com/docs/connect)
- [Direct Charges](https://stripe.com/docs/connect/direct-charges)
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Connect Webhooks](https://stripe.com/docs/connect/webhooks)
