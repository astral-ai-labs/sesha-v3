/* ==========================================================================*/
// firecrawl.ts — Singleton FireCrawl client and scrapeUrl helper
/* ==========================================================================*/
// Purpose: Provide a single FireCrawlApp instance and a helper to scrape URLs
// Sections: Imports, Constants, Types, Helpers, Public API Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// External Packages --------------------------------------------------------
import FireCrawlApp from "@mendable/firecrawl-js";
import { config } from "dotenv";

/* ==========================================================================*/
// Constants
/* ==========================================================================*/

config({ path: ".env" });

const API_KEY = process.env.FIRECRAWL_API_KEY;

if (!API_KEY) {
  throw new Error("FIRECRAWL_API_KEY is not set");
}

const DEFAULT_TIMEOUT = 40000; // ms
// const DEFAULT_WAIT_FOR = 2000; // ms

const EXCLUDE_TAGS: readonly string[] = [
  "google-analytics",
  "googletagmanager",
  "facebook.com/tr",
  "doubleclick",
  "googlesyndication",
  "amazon-adsystem",
  "adsystem",
  "ads",
  "analytics",
  "tracking",
  "metrics",
  "iframe",
  "script",
  "object",
  "embed",
  "tagmanager",
  "pixel",
  "quantserve",
  "scorecardresearch",
  "hotjar",
  "segment",
  "snowplow",
  "hubspot",
  "outbrain",
  "taboola",
  "mixpanel",
  "heap",
  "matomo",
  "crazyegg",
  "clicky",
  "optimizely",
  "newrelic",
  "logrocket",
  "chartbeat",
  "kissmetrics",
  "consent",
  "gtm",
  "adservice",
  "criteo",
  "smartadserver",
  "openx",
  "pubmatic",
  "rubiconproject",
  "appnexus",
  "adsafe",
  "adform",
  "teads",
  "lotame",
  "bidswitch",
  "revcontent",
  "trustarc",
  "privacy",
  "beacon",
  "syndication",
  "track",
  "measure",
  "tag",
  "stats",
  "sdk",
] as const;

/* ==========================================================================*/
// Types and Interfaces
/* ==========================================================================*/

type FireCrawlFormat = 
  | "markdown" 
  | "html" 
  | "rawHtml" 
  | "content" 
  | "links" 
  | "screenshot" 
  | "screenshot@fullPage" 
  | "extract" 
  | "json" 
  | "changeTracking";

interface ScrapeOptions {
  /** Alternative content formats. Defaults to ["markdown"]. */
  formats?: FireCrawlFormat[];
  /** Whether to keep only main content. Defaults to true. */
  onlyMainContent?: boolean;
  /** Extra tags to exclude in addition to built-ins. */
  excludeTags?: string[];
  /** Time to wait after page load (ms). */
  waitFor?: number;
  /** Abort after this timeout (ms). */
  timeout?: number;
  /** Any other options supported by FireCrawl. */
  [key: string]: unknown;
}

/* ==========================================================================*/
// Helpers
/* ==========================================================================*/

let clientInstance: FireCrawlApp | null = null;

/**
 * getFireCrawlClient
 *
 * Lazily instantiate a singleton FireCrawlApp.
 *
 * @returns Singleton FireCrawlApp instance
 */
function getFireCrawlClient(): FireCrawlApp {
  if (!clientInstance) {
    clientInstance = new FireCrawlApp({ apiKey: API_KEY });
  }
  return clientInstance;
}

/**
 * scrapeUrl
 *
 * Scrape a URL using the singleton FireCrawl client.
 *
 * @param url - Fully-qualified URL to scrape
 * @param options - Optional overrides (see ScrapeOptions)
 * @returns FireCrawl scrape result promise
 *
 * @example
 * const result = await scrapeUrl("https://example.com");
 */
async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {},
): Promise<unknown> {
  const client = getFireCrawlClient();

  const {
    formats = ["markdown"],
    onlyMainContent = true,
    excludeTags = EXCLUDE_TAGS as unknown as string[],
    // waitFor = DEFAULT_WAIT_FOR,
    timeout = DEFAULT_TIMEOUT,
    ...rest
  } = options;

  // TODO: consider retry/backoff strategy for transient errors.
  return client.scrapeUrl(url, {
    formats,
    onlyMainContent,
    excludeTags,
    // waitFor,
    timeout,
    ...rest,
  });
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { getFireCrawlClient, scrapeUrl };
export type { ScrapeOptions, FireCrawlFormat };
