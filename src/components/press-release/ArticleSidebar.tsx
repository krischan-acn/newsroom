// press-release/ArticleSidebar.tsx
//
// The release rail. Same dimensions and type scale as the company rail — both
// are built from ui/Rail — but borderless rather than boxed: the article's h1
// is the page, and nothing here should compete with it.

import Link from 'next/link';
import { LanguageTag } from '@/components/ui/LanguageTag';
import { formatDateTime } from '@/lib/utils';
import {
  RAIL_WIDTH,
  RAIL_PILL,
  RailSection,
  RailRow,
  RailExternalLink,
} from '@/components/ui/Rail';
import type { PressReleaseData } from './types';
import type { ReleaseVersion } from '@/services/release-versions';
import { RELEASE_VERSIONS_SUPPORTED } from '@/services/release-versions';

interface Props {
  data: PressReleaseData;
  versions: ReleaseVersion[];
}

/**
 * Language editions of this release.
 *
 * Renders the populated design already — each sibling becomes a linked pill the
 * moment the API can group translations. Until then only the current edition is
 * known, so that is all that shows. See services/release-versions.ts for what
 * the backend needs to supply.
 */
function ReleaseVersions({ versions }: { versions: ReleaseVersion[] }) {
  if (versions.length === 0) return null;

  return (
    <RailSection title="Release versions">
      <div className="flex flex-wrap gap-1.5">
        {versions.map(version =>
          version.href ? (
            <Link
              key={version.articleId}
              href={version.href}
              className={`${RAIL_PILL} border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900`}
            >
              {version.label}
            </Link>
          ) : (
            <span
              key={version.articleId}
              aria-current="true"
              className={`${RAIL_PILL} bg-[#2088c9] text-white`}
            >
              {version.label}
            </span>
          ),
        )}
      </div>

      {/* Development-only: shows the team what this block becomes once
          translations can be grouped. Never rendered in production. */}
      {!RELEASE_VERSIONS_SUPPORTED && process.env.NODE_ENV !== 'production' && (
        <div className="mt-2 rounded border border-dashed border-amber-300 bg-amber-50/50 p-2">
          <p className="text-[10px] leading-relaxed text-amber-800">
            <span className="font-semibold">Stub.</span> Only the current edition
            is listed — the API has no key linking a release to its translations.
            Siblings render as linked pills once it does. See{' '}
            <code className="font-mono">services/release-versions.ts</code>.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 opacity-40">
            {['English', 'Japanese', 'Simplified Chinese'].map(label => (
              <span
                key={label}
                className={`${RAIL_PILL} border border-dashed border-gray-300 text-gray-500`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </RailSection>
  );
}

export function ArticleSidebar({ data, versions }: Props) {
  const company = data.companies?.[0];
  const socialCandidates: [string, string | undefined][] = company
    ? [
        ['Facebook', company.facebook],
        ['X', company.twitter],
        ['LinkedIn', company.linkedin],
        ['YouTube', company.youtube],
        ['Telegram', company.telegram],
      ]
    : [];
  const socials = socialCandidates.filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  // sub_Location is the city, name the country: "TOKYO, Japan".
  const place = [data.location?.sub_Location, data.location?.name]
    .filter(Boolean)
    .join(', ');

  return (
    <aside className={RAIL_WIDTH}>
      <div className="lg:sticky lg:top-6 lg:border-l lg:border-gray-200 lg:pl-6">
        {company && (
          <RailSection title="Released by">
            {company.logofilename && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={company.logofilename}
                alt={company.company_Name}
                className="max-h-10 w-auto max-w-[140px] object-contain object-left mb-2"
              />
            )}
            <Link
              href={`/company/${company.comp_ID}`}
              className="text-xs font-semibold text-gray-900 hover:text-[#2088c9] transition-colors"
            >
              {company.company_Name}
            </Link>
          </RailSection>
        )}

        {data.summary && (
          <RailSection title="Release summary">
            <p className="text-xs leading-relaxed text-gray-600">{data.summary}</p>
          </RailSection>
        )}

        <ReleaseVersions versions={versions} />

        <RailSection title="Details">
          <dl>
            <RailRow label="Published" value={formatDateTime(data.dateTime, data.language)} />
            <RailRow label="Source" value={data.source} />
            {/* Region and country used to be hardcoded to East Asia / Japan. */}
            <RailRow label="Location" value={place} />
            <RailRow
              label="Language"
              value={data.language ? <LanguageTag value={data.language} /> : null}
            />
            <RailRow label="Topic" value={data.topic} />
            <RailRow label="Views" value={data.views !== '0' ? data.views : null} />
          </dl>
        </RailSection>

        {data.sector.length > 0 && (
          <RailSection title="Topics">
            <div className="flex flex-wrap gap-1.5">
              {data.sector.map(sector => (
                <Link
                  key={sector}
                  href={`/search?sector=${encodeURIComponent(sector)}`}
                  className={`${RAIL_PILL} bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900`}
                >
                  {sector}
                </Link>
              ))}
            </div>
          </RailSection>
        )}

        {socials.length > 0 && (
          <RailSection title="Follow">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {socials.map(([label, url]) => (
                <RailExternalLink key={label} href={url}>
                  {label}
                </RailExternalLink>
              ))}
            </div>
          </RailSection>
        )}
      </div>
    </aside>
  );
}
