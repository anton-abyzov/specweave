# Payments Integration

**Version**: 1.0.0
**Author**: SpecWeave Contributors
**License**: MIT

## Description

Complete payment processing expertise for Stripe, PayPal, and marketplace payments (Stripe Connect). Covers checkout flows, webhooks, subscriptions, Direct/Destination Charge patterns, billing automation, dunning management, and PCI compliance.

## Skills

| Skill | Description |
|-------|-------------|
| payments | Payment integration expert for Stripe, PayPal, and marketplace payments with checkout flows, webhooks, subscriptions, and idempotent payment processing |
| billing-automation | Automated billing systems for SaaS subscription management, invoicing, payment recovery, proration calculations, and tax compliance |
| pci-compliance | PCI DSS compliance expert for secure payment card handling, tokenization, encryption, access control, and audit preparation |

## Commands

| Command | Description |
|---------|-------------|
| /sw-payments:stripe-setup | Complete Stripe integration setup with production-ready code templates, security best practices, and testing workflows |
| /sw-payments:subscription-flow | Implement subscription billing workflows with recurring charges, billing cycles, and customer management |
| /sw-payments:subscription-manage | Manage existing subscriptions including upgrades, downgrades, cancellations, and dunning workflows |
| /sw-payments:webhook-setup | Configure Stripe webhooks for payment events with signature validation and idempotent processing |

## Installation

```bash
vskill add specweave --plugin sw-payments
```

## Requirements

- SpecWeave core plugin (sw@specweave)
- Stripe account with API keys
- HTTPS endpoint for webhook handling
- Database for payment records
