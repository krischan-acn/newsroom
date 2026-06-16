import type { Metadata } from 'next';
import Link from 'next/link';
import { PressReleaseItem } from '@/components/press-release/PressReleaseItem';
import { fetchNewsList } from '@/services/news-list';
import { generateListingMetadata } from '@/lib/metadata';

export const metadata: Metadata = generateListingMetadata('news');

type Props = {
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const limit = Math.max(1, parseInt(sp.limit ?? '20', 10));

  const articles = await fetchNewsList(page, limit);
  const hasNext = articles.length === limit;

  const buildHref = (p: number) => {
    const qs = new URLSearchParams({ page: String(p) });
    if (sp.limit) qs.set('limit', sp.limit);
    return `/news?${qs}`;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl tracking-tight text-black mb-8">
        All Press Releases
      </h1>

      {articles.length === 0 ? (
        <p className="text-gray-500 py-8">No news found.</p>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {articles.map((article) => (
              <PressReleaseItem
                key={article.id}
                article={{
                  id: article.id,
                  headline: article.headline,
                  dateTime: article.dateTime,
                  thumbImage: article.thumbImage,
                  description: article.description ?? null,
                }}
                companyName={article.companyName}
                logoSrc={article.logoSrc}
                sectors={article.sector ? [article.sector] : null}
                showMeta
              />
            ))}
          </div>

          {(page > 1 || hasNext) && (
            <div className="flex items-center justify-between mt-8">
              <Link
                href={page > 1 ? buildHref(page - 1) : '#'}
                aria-disabled={page <= 1}
                className={`px-4 py-2 text-sm rounded border ${
                  page <= 1
                    ? 'text-gray-300 border-gray-200 pointer-events-none'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Previous
              </Link>
              <span className="text-sm text-gray-600">Page {page}</span>
              <Link
                href={hasNext ? buildHref(page + 1) : '#'}
                aria-disabled={!hasNext}
                className={`px-4 py-2 text-sm rounded border ${
                  !hasNext
                    ? 'text-gray-300 border-gray-200 pointer-events-none'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
