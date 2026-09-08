import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PressReleaseItem } from '@/components/press-release/PressReleaseItem';
import { CompanySidebar } from '@/components/company/CompanySidebar';
import { CompanyPagination } from '@/components/company/CompanyPagination';
import { FeedUnavailable } from '@/components/company/FeedUnavailable';
import { fetchCompanyArticlesPage } from '@/services/company-articles';
import { fetchCompanyProfile } from '@/services/company-profile';
import { generateCompanyMetadata, SITE_URL } from '@/lib/metadata';

const PAGE_SIZE = 15;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await fetchCompanyProfile(id);
  return generateCompanyMetadata(profile, id);
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const sp = await searchParams;
  const requestedPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const [profile, feed] = await Promise.all([
    fetchCompanyProfile(id),
    fetchCompanyArticlesPage(id, requestedPage, PAGE_SIZE),
  ]);

  if (!profile) notFound();

  // Past the last page there is nothing to show and no way back but Previous,
  // so treat a too-high ?page= as a missing page rather than an empty feed.
  // An unreachable feed is excluded: we do not know that the page is past the
  // end, and 404ing a real page because the API blinked is the bug this whole
  // partial-render path exists to avoid.
  if (feed.articles.length === 0 && requestedPage > 1 && !feed.unavailable) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: profile.name,
    url: `${SITE_URL}/company/${profile.id}`,
    ...(profile.logoSrc && {
      logo: { '@type': 'ImageObject', url: profile.logoSrc },
    }),
    ...(profile.description.length > 0 && { description: profile.description[0] }),
    ...(profile.website && { sameAs: [profile.website, ...profile.socials.map(s => s.url)] }),
    ...(profile.established && { foundingDate: profile.established }),
    ...(profile.headquarters.length > 0 && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: profile.headquarters.join(', '),
        ...(profile.country && { addressCountry: profile.country }),
      },
    }),
    ...(profile.telephone && { telephone: profile.telephone }),
    publishingPrinciples: SITE_URL,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl min-h-125 lg:px-8 py-8">
        {/*
          The API was unreachable, so this page was assembled from the local
          company index and curated file. Everything on it is real — it is just
          not everything. Said once at the top rather than repeated per card,
          because the cards already self-omit and a reader does not need to be
          told six times that something is missing.
        */}
        {profile.isPartial && (
          <div
            role="status"
            className="border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-[15px] text-amber-900"
          >
            Some details for this company are temporarily unavailable. What is
            shown below is accurate; the rest will return shortly.
          </div>
        )}

        <div className="flex flex-col-reverse lg:flex-row lg:items-start gap-8 lg:gap-12">
          {/* Main column: who they are, then everything they have published. */}
          <div className="flex-1 min-w-0">
            {profile.description.length > 0 && (
              <section className="mb-10">
                <h2 className="text-2xl font-semibold text-black mb-4">
                  Company Description
                </h2>
                <div className="space-y-4">
                  {profile.description.map((paragraph, i) => (
                    <p key={i} className="text-[15px] text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-semibold text-black mb-4">
                {profile.description.length > 0 ? 'Press Releases' : `Press Releases from ${profile.name}`}
              </h2>

              {feed.unavailable ? (
                <FeedUnavailable companyName={profile.name} />
              ) : feed.articles.length === 0 ? (
                <p className="text-gray-500 py-8">
                  No press releases found for this company.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {feed.articles.map(article => (
                      <PressReleaseItem
                        key={article.id}
                        article={article}
                        companyName={profile.name}
                        logoSrc={null}
                        hideLogo
                        sectors={null}
                        showMeta={false}
                      />
                    ))}
                  </div>

                  <CompanyPagination
                    basePath={`/company/${profile.id}`}
                    page={feed.page}
                    hasNext={feed.hasNext}
                    hasPrevious={feed.hasPrevious}
                  />
                </>
              )}
            </section>
          </div>

          <CompanySidebar profile={profile} />
        </div>
      </div>
    </>
  );
}
