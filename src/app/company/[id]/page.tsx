import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PressReleaseItem } from '@/components/press-release/PressReleaseItem';
import { CompanySidebar } from '@/components/company/CompanySidebar';
import { CompanyPagination } from '@/components/company/CompanyPagination';
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
  if (feed.articles.length === 0 && requestedPage > 1) notFound();

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

      <div className="container mx-auto px-4 py-6 max-w-7xl min-h-125">
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

              {feed.articles.length === 0 ? (
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
