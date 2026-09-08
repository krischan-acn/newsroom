// components/company/FeedUnavailable.tsx
//
// Shown in place of the release list when the feed could not be fetched — as
// opposed to fetching fine and finding nothing, which keeps its own "no press
// releases" copy.
//
// The distinction matters: "this company has published nothing" is a claim
// about the company, and it is the wrong thing to tell a reader when the truth
// is that we could not reach the API.
//
// The placeholder rows are deliberately inert and few. This is not a loading
// skeleton — nothing is arriving — so it does not pulse, and it stops at three
// rows so it reads as "the shape of what is missing" rather than pretending a
// long archive is on its way.

function PlaceholderRow() {
  return (
    <div className="flex gap-4 py-5" aria-hidden="true">
      <div className="w-28 h-16 shrink-0 rounded bg-gray-100" />
      <div className="flex-1 min-w-0 space-y-2 py-1">
        <div className="h-3.5 w-11/12 rounded bg-gray-100" />
        <div className="h-3.5 w-3/4 rounded bg-gray-100" />
        <div className="h-3 w-1/4 rounded bg-gray-50" />
      </div>
    </div>
  );
}

export function FeedUnavailable({ companyName }: { companyName: string }) {
  return (
    <div>
      <div className="border border-gray-200 bg-gray-50 px-4 py-3 mb-2">
        <p className="text-[15px] text-gray-700">
          Press releases could not be loaded right now.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          This is a temporary problem reaching the newswire, not a sign that{' '}
          {companyName} has published nothing. Please try again shortly.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        <PlaceholderRow />
        <PlaceholderRow />
        <PlaceholderRow />
      </div>
    </div>
  );
}
