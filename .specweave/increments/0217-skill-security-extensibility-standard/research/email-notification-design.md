# Email Notification System Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US10-08 (T-036)
**Dependencies**: T-029 (Submission State Machine)

---

## 1. Overview

The email notification system notifies skill authors about the status of their submissions. Email is opt-in — submitters can provide an email address for notifications, but it is not required. Those who don't provide email can check status via the API or web tracker.

---

## 2. Service Choice: Resend

| Attribute | Details |
|-----------|---------|
| **Service** | [Resend](https://resend.com) |
| **Free tier** | 100 emails/day, 3,000/month |
| **API** | REST + Node.js SDK |
| **Templates** | React Email components |
| **Delivery** | DKIM, SPF, DMARC support |
| **Pricing** | Free → $20/mo (50K emails) → custom |

**Why Resend**:
- Modern API designed for developers
- React Email integration (shared component library with web app)
- Generous free tier covers early-stage volume
- Built by the team behind react-email.com
- No vendor lock-in (standard SMTP fallback)

---

## 3. Email Triggers

| # | Trigger | Event | Recipients | Timing |
|---|---------|-------|-----------|--------|
| 1 | `submission_received` | Submission created | Submitter | Immediate |
| 2 | `auto_approved` | Both tiers passed, skill published | Submitter | On publish |
| 3 | `needs_review` | Flagged for manual review | Submitter | On flag |
| 4 | `rejected` | Submission rejected at any tier | Submitter | On rejection |
| 5 | `version_published` | Updated version published | Submitter | On publish |

---

## 4. Template Designs

All templates live in `packages/web/src/emails/` as React Email components.

### 4.1 Submission Received

```typescript
// emails/SubmissionReceived.tsx
interface SubmissionReceivedProps {
  skillName: string;
  submissionId: string;
  repoUrl: string;
  trackUrl: string;
}
```

**Subject**: `Your skill "${skillName}" has been submitted for verification`

**Body**:
```
Hi there,

We received your submission for "{skillName}".

  Repository: {repoUrl}
  Submission ID: {submissionId}

Your skill is now entering our three-tier verification pipeline:
  1. Tier 1: Automated pattern scan (< 1 minute)
  2. Tier 2: AI-powered security analysis (5-15 minutes)
  3. Publish: If both tiers pass, your skill goes live automatically

Track progress: {trackUrl}

— The verified-skill.com team
```

### 4.2 Auto-Approved

```typescript
// emails/AutoApproved.tsx
interface AutoApprovedProps {
  skillName: string;
  version: string;
  tier: string;
  score: number;
  badgeUrl: string;
  skillPageUrl: string;
}
```

**Subject**: `"{skillName}" is verified and published!`

**Body**:
```
Great news!

Your skill "{skillName}" passed verification and is now live on verified-skill.com.

  Version: {version}
  Tier: {tier}
  Score: {score}/100
  Badge: {badgeUrl}

Add a badge to your README:
  ![Verified](https://verified-skill.com/api/v1/badges/{skillName}/verified.svg)

View your skill page: {skillPageUrl}

— The verified-skill.com team
```

### 4.3 Needs Review

```typescript
// emails/NeedsReview.tsx
interface NeedsReviewProps {
  skillName: string;
  submissionId: string;
  score: number;
  concerns: string[];
  trackUrl: string;
}
```

**Subject**: `"{skillName}" needs additional review`

**Body**:
```
Hi there,

Your skill "{skillName}" passed the initial scan but has been flagged
for additional review by our team.

  Score: {score}/100
  Concerns:
  {concerns.map(c => `  - ${c}`).join('\n')}

This typically takes 1-5 business days. We'll notify you of the outcome.

Track progress: {trackUrl}

— The verified-skill.com team
```

### 4.4 Rejected

```typescript
// emails/Rejected.tsx
interface RejectedProps {
  skillName: string;
  submissionId: string;
  reason: string;
  tier: number;
  resubmitUrl: string;
}
```

**Subject**: `"{skillName}" was not approved`

**Body**:
```
Hi there,

Unfortunately, your skill "{skillName}" did not pass our verification
at Tier {tier}.

  Reason: {reason}

Common fixes:
  - Remove eval(), exec(), or other dangerous patterns
  - Add a "security-notes" section documenting any shell access
  - Ensure declared scope matches actual instructions
  - Remove access to credentials or system directories

After making changes, you can resubmit: {resubmitUrl}

— The verified-skill.com team
```

### 4.5 Version Published

```typescript
// emails/VersionPublished.tsx
interface VersionPublishedProps {
  skillName: string;
  fromVersion: string;
  toVersion: string;
  bump: string;
  diffSummary: string;
  badgeUrl: string;
}
```

**Subject**: `"{skillName}" v{toVersion} published`

**Body**:
```
Hi there,

A new version of your skill "{skillName}" has been verified and published.

  Version: {fromVersion} → {toVersion} ({bump} bump)
  Changes: {diffSummary}
  Badge: Updated to show v{toVersion}

Update your badge URL if version-specific:
  ![Verified](https://verified-skill.com/api/v1/badges/{skillName}/{toVersion}.svg)

— The verified-skill.com team
```

---

## 5. Opt-In Mechanism

### 5.1 Submission Flow

Email is an optional field on the submission form and API:

```typescript
// POST /api/v1/submissions
{
  "repoUrl": "https://github.com/owner/repo",
  "skillName": "my-skill",
  "email": "author@example.com"   // Optional
}
```

### 5.2 No Email Provided

If no email is provided:
- No notifications are sent
- Submitter checks status via:
  - Web tracker: `https://verified-skill.com/submit/{submissionId}`
  - API: `GET /api/v1/submissions/{submissionId}`
  - CLI: `npx vskill status {submissionId}`

### 5.3 Email Storage

- Email is stored in the `Submission` model only
- Not used for marketing or newsletters
- Deleted after 90 days of submission completion (GDPR compliance)
- No email verification required (one-way notification only)

---

## 6. Sending Implementation

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';
import SubmissionReceived from './emails/SubmissionReceived';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotification(
  submission: Submission,
  emailType: EmailType
): Promise<void> {
  // Skip if no email provided
  if (!submission.submitterEmail) return;

  const template = getTemplate(emailType, submission);
  const html = render(template);

  try {
    await resend.emails.send({
      from: 'verified-skill.com <notifications@verified-skill.com>',
      to: submission.submitterEmail,
      subject: template.subject,
      html,
    });

    // Record successful send
    await db.emailNotification.create({
      data: {
        submissionId: submission.id,
        emailType,
        recipient: submission.submitterEmail,
        subject: template.subject,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    // Record failed send
    await db.emailNotification.create({
      data: {
        submissionId: submission.id,
        emailType,
        recipient: submission.submitterEmail,
        subject: template.subject,
        error: error.message,
      },
    });
    // Don't throw — email failure should not block pipeline
    console.error(`Email send failed for ${submission.id}:`, error.message);
  }
}
```

---

## 7. Rate Limiting & Abuse Prevention

| Measure | Implementation |
|---------|---------------|
| Max 5 emails per submission | Application-level check |
| Max 10 emails per email address per day | Rate limit on send function |
| No retry on permanent failures | 4xx responses = no retry |
| Retry on temporary failures | 5xx responses = retry 2x with backoff |
| Unsubscribe link | Every email includes one-click unsubscribe |

---

## 8. References

- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email/) — Template components
- [Submission State Machine](./submission-state-machine.md) — Email triggers
- [Database Schema](./database-schema.md) — EmailNotification model
