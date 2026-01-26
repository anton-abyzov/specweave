---
name: stripe-integration
description: Stripe payment integration for checkout, subscriptions, webhooks, and Connect marketplace patterns. Use when implementing Stripe payments, handling payment webhooks, or building subscription billing systems. Covers dual confirmation (webhook + frontend), mobile payment verification, 100% promo code handling, and idempotent payment operations.
---

# Stripe Integration

Master Stripe payment processing integration for robust, PCI-compliant payment flows including checkout, subscriptions, webhooks, Stripe Connect marketplace payments, and mobile/web payment verification.

## When to Use This Skill

- Implementing payment processing in web/mobile applications
- Setting up subscription billing systems
- Handling one-time payments and recurring charges
- Processing refunds and disputes
- Managing customer payment methods
- Implementing SCA (Strong Customer Authentication) for European payments
- Building marketplace payment flows with Stripe Connect
- Implementing Direct Charge or Destination Charge patterns
- Handling promo codes and 100% discount scenarios
- Implementing dual confirmation (webhook + frontend verification)
- Managing inventory/slots with payment atomicity

## Core Concepts

### 1. Payment Flows
**Checkout Session (Hosted)**
- Stripe-hosted payment page
- Minimal PCI compliance burden
- Fastest implementation
- Supports one-time and recurring payments

**Payment Intents (Custom UI)**
- Full control over payment UI
- Requires Stripe.js for PCI compliance
- More complex implementation
- Better customization options

**Setup Intents (Save Payment Methods)**
- Collect payment method without charging
- Used for subscriptions and future payments
- Requires customer confirmation

### 2. Webhooks
**Critical Events:**
- `payment_intent.succeeded`: Payment completed
- `payment_intent.payment_failed`: Payment failed
- `checkout.session.completed`: Checkout session finished (CRITICAL for Connect!)
- `checkout.session.expired`: Checkout session timed out
- `customer.subscription.updated`: Subscription changed
- `customer.subscription.deleted`: Subscription canceled
- `charge.refunded`: Refund processed
- `invoice.payment_succeeded`: Subscription payment successful
- `account.updated`: Connect account status changed
- `payout.paid` / `payout.failed`: Payout status for Connect accounts

### 3. Subscriptions
**Components:**
- **Product**: What you're selling
- **Price**: How much and how often
- **Subscription**: Customer's recurring payment
- **Invoice**: Generated for each billing cycle

### 4. Customer Management
- Create and manage customer records
- Store multiple payment methods
- Track customer metadata
- Manage billing details

### 5. Stripe Connect (Marketplace/Platform Payments)

**Charge Types:**

| Type | Who Creates | Webhook Location | Use Case |
|------|-------------|------------------|----------|
| **Direct Charge** | Connected Account | Connect endpoint | Marketplace where seller owns relationship |
| **Destination Charge** | Platform | Platform endpoint | Platform controls experience |
| **Separate Charges & Transfers** | Platform | Platform endpoint | Maximum flexibility |

**⚠️ CRITICAL: Direct Charge Webhook Gap**

When using Direct Charge, checkout sessions are created ON the Connected Account, NOT the platform. Webhooks go to the Connect endpoint, not the platform endpoint!

```
Platform endpoint:  /webhooks/stripe        → Has general events ✓
Connect endpoint:   /webhooks/stripe/connect → MUST have checkout.session.completed! ✓
```

**Connect Endpoint MUST Handle:**
- `checkout.session.completed` (CRITICAL for Direct Charge)
- `checkout.session.expired`
- `account.updated`
- `payout.paid` / `payout.failed`

## Quick Start

```python
import stripe

stripe.api_key = "sk_test_..."

# Create a checkout session
session = stripe.checkout.Session.create(
    payment_method_types=['card'],
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {
                'name': 'Premium Subscription',
            },
            'unit_amount': 2000,  # $20.00
            'recurring': {
                'interval': 'month',
            },
        },
        'quantity': 1,
    }],
    mode='subscription',
    success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url='https://yourdomain.com/cancel',
)

# Redirect user to session.url
print(session.url)
```

## Payment Implementation Patterns

### Pattern 1: One-Time Payment (Hosted Checkout)
```python
def create_checkout_session(amount, currency='usd'):
    """Create a one-time payment checkout session."""
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'Purchase',
                        'images': ['https://example.com/product.jpg'],
                    },
                    'unit_amount': amount,  # Amount in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://yourdomain.com/cancel',
            metadata={
                'order_id': 'order_123',
                'user_id': 'user_456'
            }
        )
        return session
    except stripe.error.StripeError as e:
        # Handle error
        print(f"Stripe error: {e.user_message}")
        raise
```

### Pattern 2: Custom Payment Intent Flow
```python
def create_payment_intent(amount, currency='usd', customer_id=None):
    """Create a payment intent for custom checkout UI."""
    intent = stripe.PaymentIntent.create(
        amount=amount,
        currency=currency,
        customer=customer_id,
        automatic_payment_methods={
            'enabled': True,
        },
        metadata={
            'integration_check': 'accept_a_payment'
        }
    )
    return intent.client_secret  # Send to frontend

# Frontend (JavaScript)
"""
const stripe = Stripe('pk_test_...');
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

const {error, paymentIntent} = await stripe.confirmCardPayment(
    clientSecret,
    {
        payment_method: {
            card: cardElement,
            billing_details: {
                name: 'Customer Name'
            }
        }
    }
);

if (error) {
    // Handle error
} else if (paymentIntent.status === 'succeeded') {
    // Payment successful
}
"""
```

### Pattern 3: Subscription Creation
```python
def create_subscription(customer_id, price_id):
    """Create a subscription for a customer."""
    try:
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
        )

        return {
            'subscription_id': subscription.id,
            'client_secret': subscription.latest_invoice.payment_intent.client_secret
        }
    except stripe.error.StripeError as e:
        print(f"Subscription creation failed: {e}")
        raise
```

### Pattern 4: Customer Portal
```python
def create_customer_portal_session(customer_id):
    """Create a portal session for customers to manage subscriptions."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url='https://yourdomain.com/account',
    )
    return session.url  # Redirect customer here
```

## Webhook Handling

### Secure Webhook Endpoint
```python
from flask import Flask, request
import stripe

app = Flask(__name__)

endpoint_secret = 'whsec_...'

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return 'Invalid signature', 400

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_successful_payment(payment_intent)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_canceled(subscription)

    return 'Success', 200

def handle_successful_payment(payment_intent):
    """Process successful payment."""
    customer_id = payment_intent.get('customer')
    amount = payment_intent['amount']
    metadata = payment_intent.get('metadata', {})

    # Update your database
    # Send confirmation email
    # Fulfill order
    print(f"Payment succeeded: {payment_intent['id']}")

def handle_failed_payment(payment_intent):
    """Handle failed payment."""
    error = payment_intent.get('last_payment_error', {})
    print(f"Payment failed: {error.get('message')}")
    # Notify customer
    # Update order status

def handle_subscription_canceled(subscription):
    """Handle subscription cancellation."""
    customer_id = subscription['customer']
    # Update user access
    # Send cancellation email
    print(f"Subscription canceled: {subscription['id']}")
```

### Webhook Best Practices
```python
import hashlib
import hmac

def verify_webhook_signature(payload, signature, secret):
    """Manually verify webhook signature."""
    expected_sig = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_sig)

def handle_webhook_idempotently(event_id, handler):
    """Ensure webhook is processed exactly once."""
    # Check if event already processed
    if is_event_processed(event_id):
        return

    # Process event
    try:
        handler()
        mark_event_processed(event_id)
    except Exception as e:
        log_error(e)
        # Stripe will retry failed webhooks
        raise
```

## Customer Management

```python
def create_customer(email, name, payment_method_id=None):
    """Create a Stripe customer."""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        payment_method=payment_method_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        } if payment_method_id else None,
        metadata={
            'user_id': '12345'
        }
    )
    return customer

def attach_payment_method(customer_id, payment_method_id):
    """Attach a payment method to a customer."""
    stripe.PaymentMethod.attach(
        payment_method_id,
        customer=customer_id
    )

    # Set as default
    stripe.Customer.modify(
        customer_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        }
    )

def list_customer_payment_methods(customer_id):
    """List all payment methods for a customer."""
    payment_methods = stripe.PaymentMethod.list(
        customer=customer_id,
        type='card'
    )
    return payment_methods.data
```

## Refund Handling

```python
def create_refund(payment_intent_id, amount=None, reason=None):
    """Create a refund."""
    refund_params = {
        'payment_intent': payment_intent_id
    }

    if amount:
        refund_params['amount'] = amount  # Partial refund

    if reason:
        refund_params['reason'] = reason  # 'duplicate', 'fraudulent', 'requested_by_customer'

    refund = stripe.Refund.create(**refund_params)
    return refund

def handle_dispute(charge_id, evidence):
    """Update dispute with evidence."""
    stripe.Dispute.modify(
        charge_id,
        evidence={
            'customer_name': evidence.get('customer_name'),
            'customer_email_address': evidence.get('customer_email'),
            'shipping_documentation': evidence.get('shipping_proof'),
            'customer_communication': evidence.get('communication'),
        }
    )
```

## Testing

```python
# Use test mode keys
stripe.api_key = "sk_test_..."

# Test card numbers
TEST_CARDS = {
    'success': '4242424242424242',
    'declined': '4000000000000002',
    '3d_secure': '4000002500003155',
    'insufficient_funds': '4000000000009995'
}

def test_payment_flow():
    """Test complete payment flow."""
    # Create test customer
    customer = stripe.Customer.create(
        email="test@example.com"
    )

    # Create payment intent
    intent = stripe.PaymentIntent.create(
        amount=1000,
        currency='usd',
        customer=customer.id,
        payment_method_types=['card']
    )

    # Confirm with test card
    confirmed = stripe.PaymentIntent.confirm(
        intent.id,
        payment_method='pm_card_visa'  # Test payment method
    )

    assert confirmed.status == 'succeeded'
```

## ⚠️ Critical Production Patterns

### 1. 100% Promo Code Detection (WRONG vs CORRECT)

**Common Mistake:**
```python
# ❌ WRONG - no_payment_required is for different scenarios!
if session.payment_status == 'no_payment_required':
    handle_free_checkout()
```

**Correct Detection:**
```python
# ✅ CORRECT - 100% promo codes have: status=complete, payment_status=paid, amount_total=0
def is_100_percent_promo(session):
    """Detect 100% discount promo code checkout."""
    return (
        session.payment_status == 'paid' and
        session.amount_total == 0 and
        session.payment_intent is None  # No payment intent when $0
    )

# In webhook handler
if session.status == 'complete':
    if is_100_percent_promo(session):
        # Handle free checkout from promo code
        fulfill_order(session)
    else:
        # Normal paid checkout
        fulfill_order(session)
```

**Key Insight:** Stripe says "paid" even when amount is $0 from a promo code. The `no_payment_required` status is for different scenarios (like $0 invoices for metered billing).

---

### 2. Dual Confirmation Pattern (Webhook + Frontend)

**Problem:** Frontend verification alone fails when:
- User closes browser before redirect
- Network error during verify call
- Web mode where payment happens in separate tab

**Solution: Dual Confirmation Architecture**
```
Payment Complete
      ↓
 ┌────┴────┐
 ↓         ↓
Webhook   Frontend
(async)   (polling)
 ↓         ↓
 └────┬────┘
      ↓
First one wins (idempotent)
```

**Backend Implementation:**
```typescript
// Idempotent order confirmation - BOTH webhook and frontend call this
async function confirmPayment(sessionId: string): Promise<boolean> {
  // Atomic conditional update - only updates if still pending
  const result = await db
    .update(orders)
    .set({
      status: 'paid',
      paidAt: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(orders.stripeSessionId, sessionId),
        eq(orders.status, 'pending')  // CRITICAL: Only if still pending!
      )
    );

  if (result.changes === 0) {
    // Already processed by other path - that's OK!
    return false;
  }

  // We just confirmed it - now do post-payment work
  await decrementInventory(sessionId);
  await sendConfirmationEmail(sessionId);
  return true;
}

// Webhook endpoint
app.post('/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(...);

  if (event.type === 'checkout.session.completed') {
    await confirmPayment(event.data.object.id);
  }

  res.json({ received: true });
});

// Frontend verify endpoint
app.get('/api/verify-payment/:sessionId', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

  if (session.status === 'complete') {
    await confirmPayment(session.id);
    return res.json({ success: true });
  }

  res.json({ success: false, status: session.status });
});
```

**Frontend with Exponential Backoff (React Native/Web):**
```typescript
async function verifyPaymentWithRetry(
  sessionId: string,
  attempts = 3,
  initialDelay = 1500
): Promise<boolean> {
  let delay = initialDelay;

  for (let i = 0; i < attempts; i++) {
    await sleep(delay);

    try {
      const result = await api.verifyPayment(sessionId);

      if (result.success) return true;

      if (result.status === 'pending') {
        // Still processing - increase delay and retry
        delay = Math.min(delay * 1.5, 5000);
        continue;
      }

      // Failed or expired
      return false;
    } catch (error) {
      // Network error - retry
      delay = Math.min(delay * 1.5, 5000);
    }
  }

  return false;
}
```

---

### 3. Idempotency for All Payment Operations

**Problem:** Webhook and frontend can race, causing:
- Double inventory/slot decrements
- Duplicate notifications
- Inconsistent state

**Solution: Conditional UPDATE Pattern**
```sql
-- Only update if still in expected state
UPDATE orders
SET status = 'paid', updated_at = NOW()
WHERE id = $1 AND status = 'pending';

-- Check affected rows
-- If 0 rows affected → another process already handled it → skip side effects
```

**TypeScript/Drizzle Implementation:**
```typescript
async function processPaymentIdempotently(orderId: string) {
  const result = await db
    .update(orders)
    .set({ status: 'paid', updatedAt: new Date() })
    .where(and(
      eq(orders.id, orderId),
      eq(orders.status, 'pending')
    ));

  if (result.changes === 0) {
    // Already processed - safe to skip
    console.log(`Order ${orderId} already processed`);
    return { alreadyProcessed: true };
  }

  // We just confirmed - NOW do side effects
  await decrementInventory(orderId);
  await sendEmail(orderId);

  return { alreadyProcessed: false };
}
```

---

### 4. Web Browser Payment Flow (React Native/Expo)

**Problem:** `WebBrowser.openBrowserAsync` behaves DIFFERENTLY on web vs native!

| Platform | Return Timing | `result.type` | User State |
|----------|---------------|---------------|------------|
| **iOS/Android** | After browser closed | `'dismiss'` or `'cancel'` | Back in app |
| **Web** | Immediately | `'opened'` | **Still viewing Stripe checkout!** |

**⚠️ CRITICAL: On web, you CAN'T verify payment immediately because the user is still looking at Stripe checkout in another tab!**

**Correct Solution - Platform-Specific Handling:**
```typescript
import * as WebBrowser from 'expo-web-browser';
import { Platform, Alert } from 'react-native';

async function handlePayment(checkoutUrl: string, sessionId: string) {
  const result = await WebBrowser.openBrowserAsync(checkoutUrl);

  // Platform-specific handling based on result.type
  switch (result.type) {
    case 'cancel':
      // Native only: User explicitly cancelled (X button)
      // Don't verify - they cancelled intentionally
      Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      break;

    case 'dismiss':
      // Native only: Browser was closed (could be success or cancel)
      // NOW it's safe to verify - user is back in the app
      const success = await verifyPaymentWithRetry(sessionId);
      if (success) {
        navigation.navigate('PaymentSuccess');
      } else {
        navigation.navigate('PaymentPending');
      }
      break;

    case 'opened':
      // WEB ONLY: Browser opened but user is STILL VIEWING STRIPE!
      // Do NOT verify immediately - show dialog instead
      Alert.alert(
        'Complete Your Payment',
        'Please complete your payment in the browser tab, then return here.',
        [
          {
            text: 'I\'ve Completed Payment',
            onPress: async () => {
              const success = await verifyPaymentWithRetry(sessionId);
              if (success) {
                navigation.navigate('PaymentSuccess');
              } else {
                Alert.alert('Payment Not Found', 'We couldn\'t confirm your payment. Please try again or contact support.');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      break;
  }
}
```

**Alternative for Web: Use Window Focus Event**
```typescript
// Web-specific: Listen for when user returns to tab
if (Platform.OS === 'web') {
  const handleFocus = async () => {
    window.removeEventListener('focus', handleFocus);
    // User returned to our tab - now verify
    const success = await verifyPaymentWithRetry(sessionId);
    // Handle result...
  };
  window.addEventListener('focus', handleFocus);
}
```

**Verification with Exponential Backoff:**
```typescript
async function verifyPaymentWithRetry(
  sessionId: string,
  attempts = 3,
  initialDelay = 1500
): Promise<boolean> {
  let delay = initialDelay;

  for (let i = 0; i < attempts; i++) {
    await sleep(delay);

    try {
      const result = await api.verifyPayment(sessionId);

      if (result.success) return true;

      if (result.status === 'pending') {
        // Still processing - increase delay and retry
        delay = Math.min(delay * 1.5, 5000);
        continue;
      }

      // Failed or expired
      return false;
    } catch (error) {
      // Network error - retry
      delay = Math.min(delay * 1.5, 5000);
    }
  }

  return false;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

---

### 5. Inventory/Slot Management with Atomicity

**Rule:** ONLY modify inventory AFTER payment confirmed, and atomically.

**Problem Pattern (DON'T DO):**
```typescript
// ❌ WRONG - Decrementing before payment confirmation
await reserveSlot(slotId);  // Slot decremented
const session = await createCheckoutSession();  // Payment might fail!
// If user abandons → slot is stuck as reserved
```

**Correct Pattern:**
```typescript
// ✅ CORRECT - Only decrement AFTER payment confirmed
async function confirmBookingPayment(sessionId: string) {
  // Atomic update with inventory in single transaction
  const result = await db.transaction(async (tx) => {
    // 1. Mark order as paid (only if pending)
    const orderUpdate = await tx
      .update(orders)
      .set({ status: 'paid' })
      .where(and(
        eq(orders.stripeSessionId, sessionId),
        eq(orders.status, 'pending')
      ));

    if (orderUpdate.changes === 0) {
      return { success: false, reason: 'already_processed' };
    }

    // 2. Get order details
    const order = await tx.query.orders.findFirst({
      where: eq(orders.stripeSessionId, sessionId)
    });

    // 3. Decrement inventory atomically
    const slotUpdate = await tx
      .update(slots)
      .set({
        availableCount: sql`available_count - 1`,
        updatedAt: new Date()
      })
      .where(and(
        eq(slots.id, order.slotId),
        gt(slots.availableCount, 0)  // Prevent negative
      ));

    if (slotUpdate.changes === 0) {
      // Slot became unavailable - need to refund
      throw new Error('SLOT_UNAVAILABLE');
    }

    return { success: true };
  });

  return result;
}
```

---

### 6. Stripe Connect Direct Charge Webhook Setup

**Complete Connect Webhook Handler:**
```typescript
// /webhooks/stripe/connect - For Direct Charge events
app.post('/webhooks/stripe/connect',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        connectWebhookSecret  // Different secret from platform webhook!
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Get the connected account ID
    const connectedAccountId = event.account;

    switch (event.type) {
      case 'checkout.session.completed':
        // CRITICAL: This is where Direct Charge sessions complete!
        await handleConnectCheckoutComplete(event.data.object, connectedAccountId);
        break;

      case 'checkout.session.expired':
        await handleConnectCheckoutExpired(event.data.object, connectedAccountId);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
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

async function handleConnectCheckoutComplete(session, connectedAccountId: string) {
  // Retrieve full session with line items
  const fullSession = await stripe.checkout.sessions.retrieve(
    session.id,
    { expand: ['line_items'] },
    { stripeAccount: connectedAccountId }  // CRITICAL: Specify account!
  );

  // Confirm payment in your system
  await confirmPayment(fullSession.id);
}
```

**Stripe Dashboard Setup Required:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint for Connect: `https://yourdomain.com/webhooks/stripe/connect`
3. Select "Connected accounts" (NOT "Account")
4. Add events: `checkout.session.completed`, `checkout.session.expired`, `account.updated`, `payout.paid`, `payout.failed`

---

## Pre-Implementation Checklist

### Webhook Setup
- [ ] Platform endpoint handles platform events
- [ ] Connect endpoint handles `checkout.session.completed` (if using Direct Charge)
- [ ] Stripe Dashboard has Connect webhook with correct events
- [ ] Webhook secrets configured for BOTH endpoints (different secrets!)

### Payment Verification
- [ ] Webhook handler implemented (primary - async, reliable)
- [ ] Frontend verify endpoint implemented (secondary - immediate UX)
- [ ] Both use conditional UPDATE for idempotency
- [ ] 100% promo detected by `amount_total === 0` (NOT `no_payment_required`)
- [ ] **Web vs Native browser handling**: Check `result.type === 'opened'` (web) vs `'dismiss'/'cancel'` (native) - do NOT verify immediately on web!

### Inventory/Booking
- [ ] Inventory only modified AFTER payment confirmed
- [ ] Atomic operations prevent double-counting
- [ ] Proper error handling if slot becomes unavailable (refund flow)

### Testing
- [ ] Test with regular payment
- [ ] Test with 100% promo code
- [ ] Test browser close during payment
- [ ] Test network failure during verify
- [ ] Verify webhook receives events from Connect accounts (if applicable)

## Best Practices

1. **Always Use Webhooks**: Don't rely solely on client-side confirmation
2. **Idempotency**: Handle webhook events idempotently
3. **Error Handling**: Gracefully handle all Stripe errors
4. **Test Mode**: Thoroughly test with test keys before production
5. **Metadata**: Use metadata to link Stripe objects to your database
6. **Monitoring**: Track payment success rates and errors
7. **PCI Compliance**: Never handle raw card data on your server
8. **SCA Ready**: Implement 3D Secure for European payments

## Common Pitfalls

- **Not Verifying Webhooks**: Always verify webhook signatures
- **Missing Webhook Events**: Handle all relevant webhook events
- **Hardcoded Amounts**: Use cents/smallest currency unit
- **No Retry Logic**: Implement retries for API calls
- **Ignoring Test Mode**: Test all edge cases with test cards
