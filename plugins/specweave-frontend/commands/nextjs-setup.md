---
description: Set up Next.js 14+ App Router project with Server Components, metadata configuration, and production-ready best practices.
---

# /sw-frontend:nextjs-setup

Set up Next.js 14+ App Router project with modern best practices and production-ready configuration.

You are an expert Next.js architect specializing in the App Router, Server Components, and modern React patterns.

## Your Task

Configure a complete Next.js 14+ project with best practices for performance, SEO, and developer experience.

### 1. App Router Structure

Generate the following directory structure:

```
app/
├── layout.tsx           # Root layout with metadata
├── page.tsx             # Home page
├── loading.tsx          # Loading UI
├── error.tsx            # Error boundary
├── not-found.tsx        # 404 page
├── global-error.tsx     # Global error handler
├── api/                 # API routes
│   └── hello/
│       └── route.ts
├── (marketing)/         # Route group
│   ├── about/
│   │   └── page.tsx
│   └── contact/
│       └── page.tsx
└── (dashboard)/         # Protected route group
    ├── layout.tsx
    └── page.tsx
```

### 2. Root Layout Configuration

**app/layout.tsx**:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'App Name',
    template: '%s | App Name',
  },
  description: 'App description',
  metadataBase: new URL('https://example.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://example.com',
    siteName: 'App Name',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@username',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 3. Server Components Best Practices

**Data Fetching** (Server Component):
```typescript
// app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 3600 }, // ISR: Revalidate every hour
  });
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      <h1>Posts</h1>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

**Client Components** (for interactivity):
```typescript
'use client'; // Mark as Client Component

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 4. API Routes (Route Handlers)

**app/api/hello/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name') || 'World';

  return NextResponse.json({ message: `Hello, ${name}!` });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Process request
  return NextResponse.json({ success: true, data: body });
}
```

### 5. Middleware Configuration

**middleware.ts** (root level):
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'value');

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

### 6. next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
      },
    ],
  },
  experimental: {
    typedRoutes: true, // Type-safe navigation
  },
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 7. Environment Variables

**.env.local**:
```bash
# Public (accessible in browser)
NEXT_PUBLIC_API_URL=https://api.example.com

# Private (server-only)
DATABASE_URL=postgresql://...
API_SECRET_KEY=...
```

**Usage**:
```typescript
// Server Component or API Route
const dbUrl = process.env.DATABASE_URL;

// Client Component
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### 8. Performance Optimizations

**Dynamic Imports** (Code Splitting):
```typescript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR for this component
});
```

**Image Optimization**:
```typescript
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={600}
      priority // Load immediately
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

**Font Optimization**:
```typescript
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' });

// In layout
<body className={`${inter.variable} ${robotoMono.variable}`}>
```

### 9. Data Fetching Patterns

**Server Actions** (experimental):
```typescript
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title');

  // Database operation
  await db.post.create({ data: { title } });

  revalidatePath('/posts');
  redirect('/posts');
}
```

**Streaming with Suspense**:
```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <AsyncData />
      </Suspense>
    </div>
  );
}
```

### 10. Essential Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### 11. Deployment Configuration

**Vercel** (recommended):
- Automatic deployments from Git
- Edge Functions support
- Image Optimization CDN
- Analytics built-in

**Docker** (self-hosted):
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## Workflow

1. Ask about project requirements (API routes, auth, database, etc.)
2. Generate complete App Router structure
3. Set up metadata and SEO configuration
4. Configure middleware if needed
5. Create route groups for organization
6. Set up environment variables
7. Configure next.config.js
8. Provide setup and deployment instructions

## Example Usage

**User**: "Set up Next.js 14 with App Router and authentication"

**Response**:
Creates complete Next.js setup with:
- App Router structure with route groups
- Middleware for auth protection
- API routes for authentication
- Server and Client Components
- Metadata configuration
- Security headers
- Deployment configuration

## When to Use

- Starting new Next.js projects
- Migrating from Pages Router to App Router
- Setting up authentication flows
- Configuring SEO and metadata
- Optimizing performance
- Setting up API routes

Build production-ready Next.js applications with modern best practices!
