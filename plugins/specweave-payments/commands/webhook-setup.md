# Payment Webhook Configuration

Generate secure webhook handlers for payment providers.

## Task

You are a payment webhook security expert. Generate secure, production-ready webhook handlers.

### Steps:

1. **Ask for Provider**:
   - Stripe
   - PayPal
   - Square
   - Custom payment gateway

2. **Generate Webhook Endpoint** (Stripe):

```typescript
import crypto from 'crypto';
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const app = express();

// CRITICAL: Use raw body for webhook signature verification
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle event idempotently
    const eventId = event.id;
    const existingEvent = await db.webhookEvents.findUnique({
      where: { stripeEventId: eventId },
    });

    if (existingEvent) {
      console.log(`Duplicate webhook event: ${eventId}`);
      return res.status(200).json({ received: true });
    }

    // Store event (prevents duplicate processing)
    await db.webhookEvents.create({
      data: {
        stripeEventId: eventId,
        type: event.type,
        processedAt: new Date(),
      },
    });

    // Process event in background to return 200 quickly
    processWebhookEvent(event).catch((error) => {
      console.error(`Failed to process webhook: ${error.message}`);
      // Alert ops team
    });

    res.status(200).json({ received: true });
  }
);

async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object);
      break;

    case 'customer.created':
      await handleCustomerCreated(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

3. **Generate PayPal Webhook**:

```typescript
import crypto from 'crypto';

app.post('/api/webhooks/paypal', express.json(), async (req, res) => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID!;
  const webhookEvent = req.body;

  // Verify PayPal webhook signature
  const isValid = await verifyPayPalWebhook(req, webhookId);

  if (!isValid) {
    return res.status(400).send('Invalid webhook signature');
  }

  const eventType = webhookEvent.event_type;

  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      await handlePayPalPaymentCompleted(webhookEvent.resource);
      break;

    case 'BILLING.SUBSCRIPTION.CREATED':
      await handlePayPalSubscriptionCreated(webhookEvent.resource);
      break;

    case 'BILLING.SUBSCRIPTION.CANCELLED':
      await handlePayPalSubscriptionCancelled(webhookEvent.resource);
      break;

    default:
      console.log(`Unhandled PayPal event: ${eventType}`);
  }

  res.status(200).json({ received: true });
});

async function verifyPayPalWebhook(req, webhookId) {
  const transmissionId = req.headers['paypal-transmission-id'];
  const timestamp = req.headers['paypal-transmission-time'];
  const signature = req.headers['paypal-transmission-sig'];
  const certUrl = req.headers['paypal-cert-url'];

  const response = await fetch(
    `https://api.paypal.com/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getPayPalAccessToken()}`,
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: timestamp,
        cert_url: certUrl,
        auth_algo: req.headers['paypal-auth-algo'],
        transmission_sig: signature,
        webhook_id: webhookId,
        webhook_event: req.body,
      }),
    }
  );

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}
```

4. **Generate Webhook Testing Script**:

```typescript
// test-webhook.ts
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function testWebhook() {
  // Install Stripe CLI: brew install stripe/stripe-cli/stripe

  // Listen to webhooks
  const { stdout } = await execPromise('stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log(stdout);

  // Trigger test events
  await execPromise('stripe trigger payment_intent.succeeded');
  await execPromise('stripe trigger customer.subscription.created');
  await execPromise('stripe trigger invoice.payment_failed');
}

testWebhook();
```

5. **Generate Monitoring & Alerting**:

```typescript
// Monitor webhook failures
async function monitorWebhooks() {
  const failedEvents = await db.webhookEvents.findMany({
    where: {
      processed: false,
      createdAt: {
        lt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    },
  });

  if (failedEvents.length > 0) {
    await sendAlert({
      type: 'webhook_failure',
      count: failedEvents.length,
      events: failedEvents.map((e) => e.type),
    });
  }
}

// Retry failed webhooks
async function retryFailedWebhooks() {
  const failedEvents = await db.webhookEvents.findMany({
    where: { processed: false },
    take: 10,
  });

  for (const event of failedEvents) {
    try {
      await processWebhookEvent(event.data);
      await db.webhookEvents.update({
        where: { id: event.id },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (error) {
      console.error(`Retry failed for event ${event.id}: ${error.message}`);
    }
  }
}
```

6. **Generate Webhook Schema** (Database):

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_type ON webhook_events(type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
```

### Security Best Practices:

- ✅ Verify webhook signatures (prevent spoofing)
- ✅ Use raw request body for signature validation
- ✅ Idempotency (track event IDs, prevent duplicate processing)
- ✅ Return 200 immediately (process in background)
- ✅ Retry logic for failures
- ✅ Monitoring and alerting
- ✅ HTTPS only (secure transmission)
- ✅ IP whitelisting (optional but recommended)

### Example Usage:

```
User: "Set up secure Stripe webhook handler"
Result: Complete webhook endpoint with signature verification, idempotency, and monitoring
```
