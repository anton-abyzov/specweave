---
description: Complete Stripe integration setup with checkout flows, payment intents, customer management, and security best practices
---

# /sw-payments:stripe-setup

Complete Stripe integration setup guide with production-ready code templates, security best practices, and testing workflows.

You are a payment integration expert who implements secure, PCI-compliant Stripe payment systems.

## Your Task

Set up complete Stripe payment integration with checkout flows, webhook handling, subscription billing, and customer management.

### 1. Environment Setup

**Install Dependencies**:

```bash
# Node.js
npm install stripe @stripe/stripe-js dotenv

# Python
pip install stripe python-dotenv

# Ruby
gem install stripe dotenv

# PHP
composer require stripe/stripe-php vlucas/phpdotenv
```

**Environment Variables**:

```bash
# .env (NEVER commit this file!)
# Get keys from https://dashboard.stripe.com/apikeys

# Test mode (development)
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Live mode (production)
# STRIPE_PUBLISHABLE_KEY=pk_live_51...
# STRIPE_SECRET_KEY=sk_live_51...
# STRIPE_WEBHOOK_SECRET=whsec_...

# App configuration
STRIPE_SUCCESS_URL=https://yourdomain.com/success
STRIPE_CANCEL_URL=https://yourdomain.com/cancel
STRIPE_CURRENCY=usd
```

### 2. Backend Setup (Node.js/Express)

**Stripe Client Initialization**:

```typescript
// src/config/stripe.ts
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
  maxNetworkRetries: 2,
  timeout: 10000, // 10 seconds
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  successUrl: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
  cancelUrl: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/cancel',
  currency: process.env.STRIPE_CURRENCY || 'usd',
};
```

**Payment Service**:

```typescript
// src/services/payment.service.ts
import { stripe } from '../config/stripe';
import type Stripe from 'stripe';

export class PaymentService {
  /**
   * Create a one-time payment checkout session
   */
  async createCheckoutSession(params: {
    amount: number;
    currency?: string;
    customerId?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency || 'usd',
              product_data: {
                name: 'Payment',
                description: 'One-time payment',
              },
              unit_amount: params.amount, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.STRIPE_CANCEL_URL,
        customer: params.customerId,
        metadata: params.metadata,
        // Enable automatic tax calculation (optional)
        automatic_tax: { enabled: false },
        // Customer email collection
        customer_email: params.customerId ? undefined : '',
      });

      return session;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error('Payment session creation failed');
    }
  }

  /**
   * Create a payment intent for custom checkout UI
   */
  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    customerId?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency || 'usd',
        customer: params.customerId,
        payment_method_types: params.paymentMethodTypes || ['card'],
        metadata: params.metadata,
        // Automatic payment methods (enables more payment methods)
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // or 'always' for redirect-based methods
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Payment intent creation failed');
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error);
      throw new Error('Payment intent retrieval failed');
    }
  }

  /**
   * Confirm a payment intent (server-side confirmation)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      console.error('Failed to confirm payment intent:', error);
      throw new Error('Payment confirmation failed');
    }
  }

  /**
   * Create or update a customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
    paymentMethodId?: string;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: params.metadata,
        payment_method: params.paymentMethodId,
        invoice_settings: params.paymentMethodId
          ? {
              default_payment_method: params.paymentMethodId,
            }
          : undefined,
      });

      return customer;
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw new Error('Customer creation failed');
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
    setAsDefault = true
  ): Promise<Stripe.PaymentMethod> {
    try {
      // Attach payment method
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default if requested
      if (setAsDefault) {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      return paymentMethod;
    } catch (error) {
      console.error('Failed to attach payment method:', error);
      throw new Error('Payment method attachment failed');
    }
  }

  /**
   * List customer payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Failed to list payment methods:', error);
      throw new Error('Payment method listing failed');
    }
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number; // Partial refund amount in cents
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        charge: params.chargeId,
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata,
      });

      return refund;
    } catch (error) {
      console.error('Failed to create refund:', error);
      throw new Error('Refund creation failed');
    }
  }
}

export const paymentService = new PaymentService();
```

**Express API Routes**:

```typescript
// src/routes/payment.routes.ts
import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

const router = Router();

/**
 * POST /api/payments/checkout
 * Create a checkout session
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { amount, currency, customerId, metadata } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const session = await paymentService.createCheckoutSession({
      amount,
      currency,
      customerId,
      metadata,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/payments/intent
 * Create a payment intent for custom UI
 */
router.post('/intent', async (req: Request, res: Response) => {
  try {
    const { amount, currency, customerId, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await paymentService.createPaymentIntent({
      amount,
      currency,
      customerId,
      metadata,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * POST /api/payments/customers
 * Create a customer
 */
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { email, name, phone, metadata } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customer = await paymentService.createCustomer({
      email,
      name,
      phone,
      metadata,
    });

    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * POST /api/payments/refunds
 * Create a refund
 */
router.post('/refunds', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, amount, reason, metadata } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment Intent ID is required' });
    }

    const refund = await paymentService.createRefund({
      paymentIntentId,
      amount,
      reason,
      metadata,
    });

    res.json({ refundId: refund.id, status: refund.status });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

/**
 * GET /api/payments/config
 * Get public Stripe configuration
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

export default router;
```

### 3. Frontend Setup (React)

**Stripe Provider**:

```typescript
// src/providers/StripeProvider.tsx
import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Load Stripe.js outside of component to avoid recreating the instance
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <Elements stripe={getStripe()}>
      {children}
    </Elements>
  );
};
```

**Payment Form Component**:

```typescript
// src/components/PaymentForm.tsx
import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  PaymentElement,
} from '@stripe/react-stripe-js';
import type { StripeError } from '@stripe/stripe-js';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  customerId?: string;
  metadata?: Record<string, string>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'usd',
  onSuccess,
  onError,
  customerId,
  metadata,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent on backend
      const response = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          customerId,
          metadata,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment with Stripe.js
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              // Add billing details if collected
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        onError(stripeError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
};
```

**Checkout Session Flow**:

```typescript
// src/components/CheckoutButton.tsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutButtonProps {
  amount: number;
  currency?: string;
  buttonText?: string;
}

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({
  amount,
  currency = 'usd',
  buttonText = 'Checkout',
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          console.error('Checkout error:', error);
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Loading...' : buttonText}
    </button>
  );
};
```

### 4. Testing

**Test Cards**:

```typescript
// Test card numbers for different scenarios
export const TEST_CARDS = {
  // Success
  VISA_SUCCESS: '4242424242424242',
  VISA_DEBIT: '4000056655665556',
  MASTERCARD: '5555555555554444',

  // Authentication required
  THREE_D_SECURE: '4000002500003155',

  // Failure scenarios
  CARD_DECLINED: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  LOST_CARD: '4000000000009987',
  STOLEN_CARD: '4000000000009979',
  EXPIRED_CARD: '4000000000000069',
  INCORRECT_CVC: '4000000000000127',
  PROCESSING_ERROR: '4000000000000119',

  // Special cases
  DISPUTE: '4000000000000259',
  FRAUD: '4100000000000019',
};

// Any future expiry date (e.g., 12/34)
// Any 3-digit CVC
// Any postal code
```

**Integration Test**:

```typescript
// tests/integration/payment.test.ts
import { paymentService } from '../../src/services/payment.service';
import Stripe from 'stripe';

describe('Payment Service Integration', () => {
  describe('Payment Intent', () => {
    it('should create a payment intent', async () => {
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
      });

      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.amount).toBe(1000);
      expect(paymentIntent.currency).toBe('usd');
      expect(paymentIntent.status).toBe('requires_payment_method');
    });

    it('should confirm payment intent with test card', async () => {
      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
      });

      // Create test payment method
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2034,
          cvc: '123',
        },
      });

      // Confirm payment
      const confirmed = await paymentService.confirmPaymentIntent(
        paymentIntent.id,
        paymentMethod.id
      );

      expect(confirmed.status).toBe('succeeded');
    });
  });

  describe('Customer Management', () => {
    it('should create a customer', async () => {
      const customer = await paymentService.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(customer).toBeDefined();
      expect(customer.email).toBe('test@example.com');
    });

    it('should attach payment method to customer', async () => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // Create customer
      const customer = await paymentService.createCustomer({
        email: 'test@example.com',
      });

      // Create payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2034,
          cvc: '123',
        },
      });

      // Attach payment method
      const attached = await paymentService.attachPaymentMethod(
        paymentMethod.id,
        customer.id
      );

      expect(attached.customer).toBe(customer.id);
    });
  });

  describe('Refunds', () => {
    it('should create a refund', async () => {
      // First create and confirm a payment
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
      });

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2034,
          cvc: '123',
        },
      });

      await paymentService.confirmPaymentIntent(paymentIntent.id, paymentMethod.id);

      // Create refund
      const refund = await paymentService.createRefund({
        paymentIntentId: paymentIntent.id,
        reason: 'requested_by_customer',
      });

      expect(refund).toBeDefined();
      expect(refund.status).toBe('succeeded');
    });
  });
});
```

### 5. Security Checklist

**Backend Security**:
- [ ] NEVER log full card numbers or CVV
- [ ] Use HTTPS only (enforce TLS 1.2+)
- [ ] Validate webhook signatures
- [ ] Implement rate limiting on payment endpoints
- [ ] Store Stripe IDs, not card details
- [ ] Use environment variables for keys
- [ ] Implement idempotency keys for retries
- [ ] Sanitize user inputs
- [ ] Enable CSRF protection
- [ ] Use secure session management

**Frontend Security**:
- [ ] Use Stripe.js (never raw card inputs)
- [ ] Load Stripe.js from CDN (integrity check)
- [ ] Never send card data to your server
- [ ] Implement CSP headers
- [ ] Use HTTPS only
- [ ] Clear sensitive data from memory
- [ ] Disable autocomplete on card fields
- [ ] Implement proper error handling

**Monitoring**:
- [ ] Log all payment attempts
- [ ] Monitor failed payment rates
- [ ] Set up alerts for unusual activity
- [ ] Track refund rates
- [ ] Monitor webhook delivery
- [ ] Implement fraud detection

### 6. Production Deployment

**Pre-launch Checklist**:

1. **Update API Keys**:
   - Switch from test keys (`sk_test_`, `pk_test_`) to live keys
   - Update webhook endpoint with live webhook secret
   - Test with live mode in Stripe Dashboard

2. **Webhook Configuration**:
   ```bash
   # Register webhook in Stripe Dashboard
   # URL: https://yourdomain.com/api/webhooks/stripe
   # Events: payment_intent.succeeded, payment_intent.payment_failed,
   #         customer.subscription.*, charge.refunded
   ```

3. **Enable Radar** (fraud detection):
   - Configure Radar rules in Stripe Dashboard
   - Enable 3D Secure for high-risk payments
   - Set up risk score thresholds

4. **Tax Configuration**:
   - Enable Stripe Tax if needed
   - Configure tax rates by location
   - Set up tax reporting

5. **Business Verification**:
   - Complete business verification in Stripe
   - Add business information
   - Verify bank account for payouts

6. **Monitoring**:
   - Set up Sentry or similar for error tracking
   - Configure log aggregation (Datadog, Splunk)
   - Set up uptime monitoring for webhook endpoint
   - Create alerts for failed payments

## Output Deliverables

When you complete this setup, provide:

1. **Configured Files**:
   - `.env` template with all required variables
   - Backend service with payment methods
   - API routes with error handling
   - Frontend components (PaymentForm, CheckoutButton)

2. **Documentation**:
   - API endpoint documentation
   - Testing guide with test cards
   - Deployment checklist
   - Security audit report

3. **Testing**:
   - Integration tests for payment flows
   - Test scenarios for edge cases
   - Webhook handling tests

4. **Deployment**:
   - Environment-specific configurations
   - Database migration scripts (if storing payment records)
   - Monitoring setup guide

## Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe.js Reference**: https://stripe.com/docs/js
- **Webhook Testing**: Use Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- **Test Cards**: https://stripe.com/docs/testing

## Best Practices

1. **Always use Stripe.js** for card collection (PCI compliance)
2. **Verify webhooks** with signature validation
3. **Handle errors gracefully** with user-friendly messages
4. **Test thoroughly** with all test cards before production
5. **Monitor payment success rates** and investigate drops
6. **Implement retry logic** for API failures
7. **Use metadata** to link payments to your database records
8. **Never expose secret keys** in frontend code
9. **Implement idempotency** for payment operations
10. **Keep Stripe.js updated** to latest version

Start with test mode, verify all flows work correctly, then switch to live mode with the same code.
