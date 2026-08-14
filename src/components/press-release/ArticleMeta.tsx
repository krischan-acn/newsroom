// press-release/ArticleMeta.tsx
import Link from 'next/link';
import { LanguageTag } from '@/components/ui/LanguageTag';

interface ArticleMetaProps {
  topic?: string;
  sectors?: string[];
  source?: string;
  language?: string | null;
  // TODO: replace hardcoded defaults once the API provides region/country fields
  region?: string;
  country?: string;
  className?: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-600">{label}:</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

export function ArticleMeta({
  topic,
  sectors,
  source,
  language,
  region = 'East Asia',
  country = 'Japan',
  className = '',
}: ArticleMetaProps) {
  return (
    <dl className={`mt-10 text-sm space-y-1 ${className}`}>
      {topic && <Row label="Topic" value={topic} />}
      <Row label="Region" value={region} />
      <Row label="Country" value={country} />
      {source && <Row label="Source" value={source} />}
      {language && (
        <div className="flex gap-2 items-center">
          <dt className="text-gray-600">Language:</dt>
          <dd>
            <LanguageTag value={language} withLabel />
          </dd>
        </div>
      )}
      {sectors && sectors.length > 0 && (
        <div className="flex gap-2">
          <dt className="text-gray-600">Sectors:</dt>
          <dd className="font-semibold text-gray-900">
            {sectors.map((s, i) => (
              <span key={s}>
                <Link href={`/search?sector=${encodeURIComponent(s)}`} className="hover:underline">
                  {s}
                </Link>
                {i < sectors.length - 1 && ', '}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
