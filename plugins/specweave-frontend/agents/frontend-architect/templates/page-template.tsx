/**
 * Next.js App Router Page Template
 *
 * This template demonstrates best practices for creating pages
 * in Next.js 14+ App Router with Server Components.
 *
 * Key Features:
 * - Server Component by default (no 'use client' needed)
 * - SEO metadata generation
 * - Suspense boundaries for streaming
 * - Error handling
 * - TypeScript types
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

// Components
import { PageHeader } from '@/components/organisms/PageHeader';
import { DataTable } from '@/components/organisms/DataTable';
import { Skeleton } from '@/components/atoms/Skeleton';

// ============================================================================
// TYPES
// ============================================================================

interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    page?: string;
    sort?: string;
  };
}

// ============================================================================
// METADATA (SEO)
// ============================================================================

/**
 * Generate static metadata for SEO
 *
 * This function runs on the server and generates metadata
 * for search engines and social media.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  // Fetch data needed for metadata
  const data = await fetchData(params.id);

  if (!data) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: `${data.title} | Your App Name`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: [data.imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      images: [data.imageUrl],
    },
  };
}

/**
 * Optional: Generate static paths for Static Site Generation (SSG)
 *
 * Uncomment this function if you want to pre-render pages at build time.
 */
// export async function generateStaticParams() {
//   const items = await fetchAllItems();
//
//   return items.map((item) => ({
//     id: item.id,
//   }));
// }

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch data on the server
 *
 * This runs on the server, so you can safely access databases,
 * private APIs, etc.
 */
async function fetchData(id: string) {
  const response = await fetch(`https://api.example.com/items/${id}`, {
    next: {
      revalidate: 3600, // ISR: Revalidate every hour
      // OR use 'force-cache' for static generation
      // OR use 'no-store' for dynamic rendering
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function fetchRelatedData(filters: { page: number; sort: string }) {
  const response = await fetch(
    `https://api.example.com/related?page=${filters.page}&sort=${filters.sort}`,
    {
      next: { revalidate: 60 }, // Revalidate every minute
    }
  );

  return response.json();
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

/**
 * Page Component (Server Component by default)
 *
 * Server Components:
 * - Run on the server only
 * - Can access backend resources directly
 * - Don't add JavaScript to the client bundle
 * - Can't use hooks like useState, useEffect
 * - Can't add event handlers
 */
export default async function Page({ params, searchParams }: PageProps) {
  // ========================================================================
  // DATA FETCHING (Server-side)
  // ========================================================================

  // Parse search params
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const sort = searchParams.sort || 'desc';

  // Fetch data in parallel for performance
  const [mainData, relatedData] = await Promise.all([
    fetchData(params.id),
    fetchRelatedData({ page, sort }),
  ]);

  // Handle not found
  if (!mainData) {
    notFound(); // Renders app/not-found.tsx
  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <PageHeader
        title={mainData.title}
        description={mainData.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Items', href: '/items' },
          { label: mainData.title, href: `/items/${params.id}` },
        ]}
      />

      {/* Main Content */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="text-gray-600">ID: {mainData.id}</p>
            <p className="text-gray-600">Created: {mainData.createdAt}</p>
          </div>
        </div>
      </section>

      {/* Related Data with Suspense */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold">Related Items</h2>
        <Suspense fallback={<Skeleton className="mt-4 h-96" />}>
          <DataTable
            data={relatedData.items}
            columns={['id', 'name', 'status']}
            pagination={{
              currentPage: page,
              totalPages: relatedData.totalPages,
            }}
          />
        </Suspense>
      </section>
    </div>
  );
}

// ============================================================================
// CLIENT COMPONENT EXAMPLE (if needed)
// ============================================================================

/**
 * If you need interactivity, create a separate Client Component:
 *
 * 'use client';
 *
 * export function InteractiveSection({ initialData }) {
 *   const [state, setState] = useState(initialData);
 *
 *   return (
 *     <div>
 *       <button onClick={() => setState(...)}>Click me</button>
 *     </div>
 *   );
 * }
 *
 * Then use it in the Server Component:
 * <InteractiveSection initialData={mainData} />
 */
