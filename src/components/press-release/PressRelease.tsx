// press-release/PressRelease.tsx
import { Hero } from './Hero';
import { Body } from './Body';
import { Company } from './Company';
import { ArticleFooterLink } from './ArticleFooterLink';
import { ShareBar } from './ShareBar';
import { MoreFromCompany } from './MoreFromCompany';
import { ArticleSidebar } from './ArticleSidebar';
import type { PressReleaseData } from './types';
import type { CompanyArticle } from '@/services/company-articles';
import type { ReleaseVersion } from '@/services/release-versions';

interface PressReleaseProps {
  data: PressReleaseData;
  relatedArticles?: CompanyArticle[];
  versions?: ReleaseVersion[];
  className?: string;
}

export function PressRelease({
  data,
  relatedArticles = [],
  versions = [],
  className = '',
}: PressReleaseProps) {
  const company = data.companies?.[0];

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
        {/* Fills the shell rather than sitting at a capped measure: with a
            320px rail beside it, a cap left dead space to its right and made
            the release read narrower than it did before the rail existed. */}
        <article className="flex-1 min-w-0">
          <Hero
            headline={data.headline}
            subHeadline={data.subHeadline}
            source={data.source}
            dateTime={data.dateTime}
            language={data.language}
          />

          <ShareBar headline={data.headline} />

          <Body content={data.bodyHtml} />

          {company && <Company company={company} />}

          {/* ArticleMeta used to sit here. Its fields — topic, location, source,
              language, sectors — now live in the rail instead of being printed
              twice, and no longer fall back to a hardcoded East Asia / Japan. */}

          <ArticleFooterLink views={data.views} />

          {company && (
            <MoreFromCompany
              articles={relatedArticles}
              companyName={company.company_Name}
              companyId={company.comp_ID}
              logoSrc={company.logofilename ?? null}
              currentId={data.id}
            />
          )}
        </article>

        {/* Below the release on mobile: the text is what the reader came for. */}
        <ArticleSidebar data={data} versions={versions} />
      </div>
    </div>
  );
}
