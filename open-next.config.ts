// OpenNext (Cloudflare Workers) configuration.
//
// The newsroom relies on ISR - the homepage and every /article page are cached
// and refreshed in the background (fetch revalidate: 3600). Without the pieces
// below, every view on Workers would render from scratch again.
//
// - incrementalCache: R2 stores the rendered pages. withRegionalCache keeps a
//   copy in the Cache API of each Cloudflare location, so a cache hit does not
//   travel back to the R2 bucket's region.
// - queue: time-based revalidation needs a queue to run the background refresh.
//   The Durable Object queue is the production one (the memory queue is not).
// - No tag cache: nothing calls revalidateTag / revalidatePath.
// - enableCacheInterception: serves cached ISR pages without booting the Next
//   server. Not compatible with PPR, which this app does not use.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
	incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
	queue: doQueue,
	enableCacheInterception: true,
});
