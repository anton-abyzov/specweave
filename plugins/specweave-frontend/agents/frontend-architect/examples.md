# Frontend Architect Agent - Real-World Examples

This document provides real-world examples of using the Frontend Architect agent for common scenarios.

## Table of Contents

1. [E-Commerce Dashboard](#example-1-e-commerce-dashboard)
2. [SaaS Marketing Website](#example-2-saas-marketing-website)
3. [Real-Time Chat Application](#example-3-real-time-chat-application)
4. [Design System Migration](#example-4-design-system-migration)
5. [Performance Optimization](#example-5-performance-optimization)
6. [Micro-Frontend Setup](#example-6-micro-frontend-setup)

---

## Example 1: E-Commerce Dashboard

### Scenario
Building an admin dashboard for an e-commerce platform with inventory management, order tracking, and analytics.

### Prompt
```
Design a React-based admin dashboard for an e-commerce platform with:

Requirements:
- Real-time order notifications (WebSocket)
- Product inventory management (10,000+ SKUs)
- Analytics charts (sales, revenue, user activity)
- Multi-user role support (admin, manager, viewer)
- Mobile-responsive (tablet and desktop)

Technical Stack:
- Next.js 14 App Router
- TypeScript
- TailwindCSS
- React Query for data fetching
- Zustand for client state
- Recharts for visualization

Performance Targets:
- LCP < 2.5s
- Initial bundle < 300KB
- Smooth 60fps scrolling for large tables

Provide:
1. Component architecture (Atomic Design)
2. Folder structure
3. State management strategy
4. Data fetching patterns
5. Authentication flow
6. Optimization techniques
```

### Agent Output

#### 1. Component Architecture (Atomic Design)

```
atoms/
├── Button.tsx
├── Input.tsx
├── Badge.tsx
├── Icon.tsx
├── Avatar.tsx
├── Skeleton.tsx
└── Spinner.tsx

molecules/
├── FormField.tsx
├── SearchBar.tsx
├── Notification.tsx
├── Pagination.tsx
├── StatCard.tsx
├── DataTableHeader.tsx
└── FilterDropdown.tsx

organisms/
├── Sidebar.tsx
├── TopNav.tsx
├── OrderTable.tsx
├── ProductTable.tsx
├── AnalyticsChart.tsx
├── NotificationPanel.tsx
└── UserRoleSelector.tsx

templates/
├── DashboardLayout.tsx
├── AuthLayout.tsx
└── EmptyState.tsx

pages/
├── dashboard/
│   ├── page.tsx (Overview)
│   ├── orders/page.tsx
│   ├── products/page.tsx
│   └── analytics/page.tsx
└── login/page.tsx
```

#### 2. Folder Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   └── page.tsx
│   │   └── analytics/
│   │       └── page.tsx
│   └── api/
│       └── auth/[...nextauth]/route.ts
│
├── components/             # React components
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
│
├── lib/                    # Utilities & configuration
│   ├── api/
│   │   └── client.ts      # API client setup
│   ├── hooks/
│   │   ├── useOrders.ts
│   │   ├── useProducts.ts
│   │   ├── useWebSocket.ts
│   │   └── useAuth.ts
│   ├── store/
│   │   └── index.ts       # Zustand store
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
│
├── types/                  # TypeScript types
│   ├── order.ts
│   ├── product.ts
│   ├── user.ts
│   └── api.ts
│
└── styles/                 # Global styles
    └── globals.css
```

#### 3. State Management Strategy

**Client State (Zustand)**:
```typescript
// lib/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface DashboardState {
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';

  // User State
  user: User | null;
  permissions: string[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        theme: 'light',
        user: null,
        permissions: [],
        notifications: [],
        unreadCount: 0,

        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),

        setTheme: (theme) => set({ theme }),

        addNotification: (notification) => set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),

        markAsRead: (id) => set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      }),
      { name: 'dashboard-store' }
    )
  )
);
```

**Server State (React Query)**:
```typescript
// lib/hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiClient.getOrders(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { orderId: string; status: string }) =>
      apiClient.updateOrderStatus(params.orderId, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

#### 4. Data Fetching Patterns

**Server Components (Default)**:
```typescript
// app/(dashboard)/orders/page.tsx
import { Suspense } from 'react';
import { OrderTable } from '@/components/organisms/OrderTable';
import { Skeleton } from '@/components/atoms/Skeleton';

export default async function OrdersPage() {
  // Fetch in Server Component (no client-side loading state needed)
  const initialOrders = await fetch('https://api.example.com/orders', {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  }).then(res => res.json());

  return (
    <div>
      <h1>Orders</h1>
      <Suspense fallback={<Skeleton />}>
        <OrderTable initialData={initialOrders} />
      </Suspense>
    </div>
  );
}
```

**Client Components (Interactive)**:
```typescript
// components/organisms/OrderTable.tsx
'use client';

import { useOrders } from '@/lib/hooks/useOrders';
import { useState } from 'react';

export function OrderTable({ initialData }: { initialData: Order[] }) {
  const [filters, setFilters] = useState({ status: 'all', page: 1 });

  const { data: orders, isLoading } = useOrders(filters, {
    initialData, // Use server-fetched data as initial state
    refetchInterval: 30000, // Refetch every 30s
  });

  return (
    <div>
      {/* Filters, pagination, etc. */}
      {isLoading ? <Skeleton /> : <Table data={orders} />}
    </div>
  );
}
```

#### 5. Real-Time WebSocket Integration

```typescript
// lib/hooks/useWebSocket.ts
import { useEffect } from 'react';
import { useDashboardStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const addNotification = useDashboardStore(state => state.addNotification);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'ORDER_CREATED':
          addNotification({
            id: Date.now().toString(),
            type: 'info',
            title: 'New Order',
            message: `Order #${message.orderId} created`,
            timestamp: Date.now(),
          });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          break;

        case 'INVENTORY_LOW':
          addNotification({
            id: Date.now().toString(),
            type: 'warning',
            title: 'Low Inventory',
            message: `${message.productName} is running low`,
            timestamp: Date.now(),
          });
          break;
      }
    };

    return () => ws.close();
  }, [addNotification, queryClient]);
}

// Usage in layout
// app/(dashboard)/layout.tsx
'use client';

import { useWebSocket } from '@/lib/hooks/useWebSocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useWebSocket(); // Connect to WebSocket on mount

  return <div>{children}</div>;
}
```

#### 6. Optimization Techniques

**Code Splitting**:
```typescript
// app/(dashboard)/analytics/page.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/atoms/Skeleton';

// Lazy load heavy chart library
const AnalyticsChart = dynamic(
  () => import('@/components/organisms/AnalyticsChart'),
  {
    loading: () => <Skeleton className="h-96" />,
    ssr: false, // Don't render on server (chart library is client-only)
  }
);

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>
      <AnalyticsChart />
    </div>
  );
}
```

**Virtual Scrolling for Large Tables**:
```typescript
// components/organisms/ProductTable.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function ProductTable({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Row height
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ProductRow product={products[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Image Optimization**:
```typescript
// components/organisms/ProductCard.tsx
import Image from 'next/image';

export function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={300}
        height={300}
        placeholder="blur"
        blurDataURL={product.thumbnailUrl}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
```

---

## Example 2: SaaS Marketing Website

### Scenario
Building a high-performance marketing website for a SaaS product with SEO optimization and accessibility.

### Prompt
```
Design a Next.js marketing website for a B2B SaaS platform with:

Requirements:
- 10+ landing pages (home, features, pricing, about, blog)
- SEO optimized (meta tags, structured data, sitemap)
- Accessibility WCAG AA compliant
- Blog with MDX support
- Contact form with Resend integration
- Newsletter signup
- Dark mode support
- i18n support (English, Spanish, German)

Performance Targets:
- Lighthouse score 95+ (all categories)
- LCP < 2.5s
- CLS < 0.1
- 100% accessibility score

Technical Stack:
- Next.js 14 App Router
- TypeScript
- TailwindCSS
- shadcn/ui components
- MDX for blog
- next-intl for i18n

Provide component architecture and implementation examples.
```

### Agent Output

[Detailed architecture with folder structure, SEO setup, i18n configuration, MDX integration, and accessibility patterns]

---

## Example 3: Real-Time Chat Application

### Scenario
Building a real-time chat application with WebSocket, typing indicators, and message history.

[Full example with WebSocket setup, optimistic updates, and offline support]

---

## Example 4: Design System Migration

### Scenario
Migrating from Material-UI to a custom design system based on shadcn/ui.

[Step-by-step migration plan with component mapping and codemods]

---

## Example 5: Performance Optimization

### Scenario
Optimizing a slow Next.js application (LCP 8s → 2s target).

[Performance audit, bottleneck analysis, optimization implementation]

---

## Example 6: Micro-Frontend Setup

### Scenario
Setting up a micro-frontend architecture with Module Federation for a large enterprise application.

[Webpack 5 Module Federation setup, shared dependencies, independent deployments]

---

## Tips for Effective Prompts

1. **Be Specific**: Include framework versions, tech stack, and constraints
2. **Define Metrics**: Specify performance targets (LCP, bundle size, etc.)
3. **Provide Context**: Team size, timeline, existing infrastructure
4. **State Goals**: SEO, accessibility, mobile-first, etc.
5. **Include Examples**: Reference similar applications or patterns

## Common Patterns

### Pattern 1: Server + Client Component Split

```typescript
// Server Component (default in App Router)
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  return <ClientComponent initialData={data} />;
}

// Client Component (interactive)
'use client';
export function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  // Interactive logic here
}
```

### Pattern 2: Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update UI
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);

    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Rollback on error
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
});
```

### Pattern 3: Parallel Data Fetching

```typescript
// Fetch multiple resources in parallel (Server Component)
export default async function Page() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ]);

  return <Dashboard user={user} posts={posts} comments={comments} />;
}
```

## Additional Resources

- **Next.js Examples**: https://github.com/vercel/next.js/tree/canary/examples
- **React Patterns**: https://patterns.dev
- **TailwindCSS Components**: https://tailwindui.com
- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://radix-ui.com
