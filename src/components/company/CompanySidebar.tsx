// components/company/CompanySidebar.tsx
// The wiki-style rail: identity, contact and stock, in that order. Each card
// omits itself entirely when it has nothing to show.
//
// Built from the shared primitives in ui/Rail so this and the article rail stay
// dimensionally identical; the only difference here is `boxed`, since on this
// page the rail carries the page rather than sitting beside it.

import {
  RAIL_WIDTH,
  RailSection,
  RailRow,
  RailExternalLink,
} from '@/components/ui/Rail';
import { toDisplayUrl, type CompanyProfile } from '@/services/company-profile';

function IdentityCard({ profile }: { profile: CompanyProfile }) {
  const hasFacts =
    profile.country ||
    profile.established ||
    profile.listed ||
    profile.industry ||
    profile.employees;

  return (
    <RailSection boxed>
      {/* The company name is the page's subject, so it carries the h1 even
          though it sits in the rail. "Company Description" is a section under it. */}
      <h1 className="text-xl font-semibold text-black text-center pt-1 pb-3">
        {profile.name}
      </h1>

      {profile.logoSrc && (
        <div className="flex items-center justify-center pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.logoSrc}
            alt={`${profile.name} logo`}
            className="max-h-20 w-auto max-w-[70%] object-contain"
          />
        </div>
      )}

      {hasFacts && (
        <dl className="border-t border-gray-200 pt-1">
          <RailRow divided label="Country" value={profile.country} />
          <RailRow divided label="Established" value={profile.established} />
          <RailRow divided label="Listed" value={profile.listed} />
          <RailRow divided label="Industry" value={profile.industry} />
          <RailRow divided label="Employees" value={profile.employees} />
          {/* Website lives in Contact Details, not here — one row, one place. */}
        </dl>
      )}
    </RailSection>
  );
}

function ContactCard({ profile }: { profile: CompanyProfile }) {
  const hasContact =
    profile.headquarters.length > 0 ||
    profile.telephone ||
    profile.facsimile ||
    profile.website ||
    profile.socials.length > 0;

  if (!hasContact) return null;

  return (
    <RailSection boxed title="Contact Details">
      <dl>
        {profile.headquarters.length > 0 && (
          <RailRow
            divided
            block
            label="Address"
            value={profile.headquarters.map(line => (
              <div key={line}>{line}</div>
            ))}
          />
        )}
        <RailRow divided label="Phone" value={profile.telephone} />
        <RailRow divided label="Fax" value={profile.facsimile} />
        <RailRow
          divided
          label="Website"
          value={
            profile.website && (
              <RailExternalLink href={profile.website}>
                {toDisplayUrl(profile.website)}
              </RailExternalLink>
            )
          }
        />
        {profile.socials.length > 0 && (
          <RailRow
            divided
            block
            label="Follow"
            value={
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {profile.socials.map(social => (
                  <RailExternalLink key={social.label} href={social.url}>
                    {social.label}
                  </RailExternalLink>
                ))}
              </div>
            }
          />
        )}
      </dl>
    </RailSection>
  );
}

function StockCard({ profile }: { profile: CompanyProfile }) {
  // Unlisted entities — statutory bodies, private companies — never get this
  // card, even when the API hands back an exchange record for them.
  if (!profile.isListed) return null;

  const hasStock =
    profile.tickers.length > 0 ||
    profile.otc ||
    profile.exchangeName ||
    profile.quoteCodes.length > 0;

  if (!hasStock) return null;

  return (
    <RailSection boxed title="Stock Details">
      <dl>
        {profile.tickers.map(ticker => (
          <RailRow
            divided
            key={`${ticker.exchange}-${ticker.symbol}`}
            label={ticker.exchange}
            value={<span className="font-semibold text-gray-900">{ticker.symbol}</span>}
          />
        ))}
        <RailRow divided label="OTC" value={profile.otc} />
        <RailRow divided label="Exchange" value={profile.exchangeName} />
        {profile.quoteCodes.map(code => (
          <RailRow divided key={code.label} label={`${code.label} code`} value={code.value} />
        ))}
      </dl>
    </RailSection>
  );
}

export function CompanySidebar({ profile }: { profile: CompanyProfile }) {
  return (
    <aside className={RAIL_WIDTH}>
      <div className="lg:sticky lg:top-6">
        <IdentityCard profile={profile} />
        <ContactCard profile={profile} />
        <StockCard profile={profile} />
      </div>
    </aside>
  );
}
