# Admin Dashboard Architecture Design

**Status**: DRAFT
**Author**: anton.abyzov@gmail.com
**Date**: 2026-02-15
**Satisfies**: AC-US11-02 through AC-US11-08 (T-033)
**Dependencies**: T-031 (Submission API), T-032 (Admin Authentication)

---

## 1. Overview

The admin dashboard for verified-skill.com provides a web interface for managing skill submissions, reviewing flagged skills, monitoring platform health, and performing administrative actions. Built with Next.js App Router and React Query for data fetching.

---

## 2. Component Hierarchy

```
AdminLayout
├── Sidebar
│   ├── NavItem: Dashboard (overview)
│   ├── NavItem: Submissions (queue)
│   ├── NavItem: Skills (registry)
│   ├── NavItem: Stats (analytics)
│   └── NavItem: Settings (admin mgmt)
│
├── Header
│   ├── BreadcrumbNav
│   ├── SearchInput
│   └── UserMenu (profile, logout)
│
└── MainContent
    ├── DashboardOverview (/admin)
    │   ├── StatsGrid (4 cards: total, pending, approved today, rejected)
    │   ├── RecentSubmissions (last 10)
    │   └── TierDistribution (pie chart)
    │
    ├── SubmissionQueue (/admin/submissions)
    │   ├── StatusTabs (all, pending, needs-review, approved, rejected)
    │   ├── SubmissionTable
    │   │   ├── SubmissionRow (expandable)
    │   │   │   ├── SkillName, Author, State badge, Date
    │   │   │   └── QuickActions (approve, reject, view)
    │   │   └── Pagination
    │   └── BulkActions (approve selected, reject selected)
    │
    ├── SubmissionDetail (/admin/submissions/:id)
    │   ├── SubmissionHeader (name, repo, state, vendor badge)
    │   ├── ScanResultsPanel
    │   │   ├── Tier1Results (pattern findings table)
    │   │   └── Tier2Results (judge verdict, score, concerns)
    │   ├── StateTimeline (audit trail visualization)
    │   ├── SkillContentPreview (SKILL.md rendered)
    │   └── ActionBar (approve, reject, escalate)
    │
    ├── SkillRegistry (/admin/skills)
    │   ├── SkillTable (name, version, tier, installs, updated)
    │   └── SkillDetail (/admin/skills/:name)
    │       ├── VersionHistory (table with per-version badges)
    │       ├── AgentCompatibility (grid)
    │       └── ScanHistory (timeline)
    │
    ├── StatsOverview (/admin/stats)
    │   ├── SubmissionMetrics (submissions/day chart)
    │   ├── ApprovalFunnel (received → scanned → verified → published)
    │   ├── ScanPerformance (avg duration, pass rate by tier)
    │   ├── TopCategories (bar chart)
    │   └── TrendingSkills (leaderboard)
    │
    └── Settings (/admin/settings) — SUPER_ADMIN only
        ├── AdminManagement (list, add, deactivate admins)
        ├── TrustedOrgs (manage vendor whitelist)
        └── Configuration (thresholds, scan settings)
```

---

## 3. Data Flow

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Data fetching | TanStack React Query v5 | Server state management, caching, refetching |
| HTTP client | `fetch` (native) | API calls with auth headers |
| State management | React Query + URL params | No client-side state store needed |
| Routing | Next.js App Router | `/admin/*` route group |
| UI components | Tailwind CSS + shadcn/ui | Consistent design system |
| Charts | Recharts | Stats visualizations |
| Tables | TanStack Table v8 | Sortable, filterable tables |
| Forms | React Hook Form + Zod | Validation |

### 3.2 React Query Configuration

```typescript
// lib/api.ts
const API_BASE = '/api/v1';

async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (!refreshed) redirectToLogin();
  }

  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}

// hooks/useSubmissions.ts
function useSubmissions(filters: SubmissionFilters) {
  return useQuery({
    queryKey: ['submissions', filters],
    queryFn: () => apiClient<SubmissionsResponse>(
      `/admin/submissions?${new URLSearchParams(filters)}`
    ),
    refetchInterval: 30_000, // Refresh every 30s
  });
}

function useApproveSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient(`/admin/submissions/${id}/approve`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
  });
}
```

---

## 4. Key Views

### 4.1 Submission Queue

The primary admin workflow — a filterable list of submissions requiring attention.

```
┌─────────────────────────────────────────────────────────────────┐
│  SUBMISSION QUEUE                                               │
│                                                                 │
│  [All (42)]  [Needs Review (5)]  [Pending (12)]  [Approved]    │
│                                                                 │
│  ┌───┬──────────────────┬──────────┬──────────┬────────┬─────┐ │
│  │ □ │ Skill            │ Author   │ State    │ Score  │ Act │ │
│  ├───┼──────────────────┼──────────┼──────────┼────────┼─────┤ │
│  │ □ │ my-awesome-skill │ owner    │ NEEDS    │ 72/100 │ ··· │ │
│  │   │                  │          │ REVIEW   │        │     │ │
│  ├───┼──────────────────┼──────────┼──────────┼────────┼─────┤ │
│  │ □ │ code-reviewer    │ devtools │ TIER2    │ —      │ ··· │ │
│  │   │                  │          │ SCANNING │        │     │ │
│  ├───┼──────────────────┼──────────┼──────────┼────────┼─────┤ │
│  │ □ │ test-helper      │ testing  │ AUTO     │ 91/100 │ ··· │ │
│  │   │                  │          │ APPROVED │        │     │ │
│  └───┴──────────────────┴──────────┴──────────┴────────┴─────┘ │
│                                                                 │
│  Showing 1-20 of 42                    [← Prev]  [Next →]      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Submission Detail

Detailed view for reviewing a single submission.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Queue                                                │
│                                                                 │
│  my-awesome-skill                          [NEEDS REVIEW]       │
│  github.com/owner/repo · Submitted 2h ago                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SCAN RESULTS                                             │   │
│  │                                                          │   │
│  │ TIER 1: PASS                                             │   │
│  │ 37 patterns checked · 0 critical · 0 high · 2 medium    │   │
│  │ Duration: 234ms                                          │   │
│  │                                                          │   │
│  │ TIER 2: CONCERNS (Score: 72/100)                         │   │
│  │ Intent Analysis: Skill claims to optimize React...       │   │
│  │ Scope Alignment: Requests file write access beyond...    │   │
│  │ Concerns:                                                │   │
│  │  · eval() usage not justified in security-notes          │   │
│  │  · Scope includes system directories                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  STATE TIMELINE                                                 │
│  ● RECEIVED      18:00:00                                       │
│  ● TIER1_SCAN    18:00:01   (234ms)                            │
│  ● TIER2_SCAN    18:00:02   (12.4s, score: 72)                 │
│  ◉ NEEDS_REVIEW  18:00:15   (waiting for admin)                │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │ [✓ Approve]  [✗ Reject]  [⇧ Escalate]  │                  │
│  │                                          │                  │
│  │ Rejection reason:                        │                  │
│  │ ┌──────────────────────────────────────┐ │                  │
│  │ │ ___________________________________ │ │                  │
│  │ └──────────────────────────────────────┘ │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Admin Actions

| Action | UI Element | Required Role | API Call |
|--------|-----------|---------------|----------|
| Approve | Green button | REVIEWER+ | `PATCH /admin/submissions/:id/approve` |
| Reject | Red button + reason textarea | REVIEWER+ | `PATCH /admin/submissions/:id/reject` |
| Escalate | Yellow button | SUPER_ADMIN | `POST /admin/submissions/:id/escalate` |
| View details | Click row | REVIEWER+ | `GET /admin/submissions/:id` |
| Bulk approve | Checkbox + button | SUPER_ADMIN | Multiple `PATCH` calls |

### 4.4 Platform Stats

```
┌─────────────────────────────────────────────────────────────────┐
│  PLATFORM STATS                                                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   847    │  │  78.2%   │  │    5     │  │   84.7   │      │
│  │  Skills  │  │ Approval │  │ Pending  │  │ Avg Scan │      │
│  │  Total   │  │   Rate   │  │ Review   │  │  Score   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  SUBMISSIONS THIS WEEK                                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  45 ─────────────────────────●                       │      │
│  │  30 ──────────────●          │                       │      │
│  │  15 ────●         │          │                       │      │
│  │   0 ────┼─────────┼──────────┼─────────              │      │
│  │         Mon       Wed        Fri                     │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  TIER DISTRIBUTION           TOP CATEGORIES                     │
│  ┌────────────────┐         ┌────────────────────────┐         │
│  │  ▓▓▓ Scanned   │ 312    │ Coding      ████████ 234│         │
│  │  ▓▓▓ Verified  │ 489    │ Security    ██████   156│         │
│  │  ▓▓▓ Certified │  46    │ DevOps      ████      98│         │
│  └────────────────┘         └────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Version History per Skill

```
┌─────────────────────────────────────────────────────────────────┐
│  react-best-practices — VERSION HISTORY                         │
│                                                                 │
│  Version   Tier         Score   Findings   Date                 │
│  ───────   ──────────   ─────   ────────   ────────            │
│  v2.2.0    VERIFIED     94      0          Feb 15, 2026        │
│  v2.1.0    VERIFIED     92      0          Feb 01, 2026        │
│  v2.0.0    VERIFIED     88      1 info     Jan 15, 2026        │
│  v1.5.0    SCANNED      —       0          Dec 10, 2025        │
│  v1.0.0    SCANNED      —       2 low      Nov 01, 2025        │
│                                                                 │
│  Each version was independently scanned and verified.           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Protected Route Layout

```typescript
// app/admin/layout.tsx
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session?.admin) {
    redirect('/admin/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={session.admin.role} />
      <div className="flex-1 overflow-auto">
        <Header admin={session.admin} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 6. Real-Time Updates

The submission queue updates automatically:
- **React Query refetch**: Every 30 seconds for the queue page
- **Optimistic updates**: Approve/reject actions update UI immediately
- **Future**: WebSocket or SSE for real-time state change notifications

---

## 7. References

- [Submission API Design](./submission-api-design.md) — API endpoints consumed
- [Admin Auth Design](./admin-auth-design.md) — Authentication flow
- [Database Schema](./database-schema.md) — Data models
- [Trust Labels & Badges](./trust-labels-badges.md) — Badge rendering
