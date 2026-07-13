export type JobSource = "greenhouse" | "lever" | "ashby" | "workday";

/** A job as scraped from an ATS feed, before it is persisted. */
export interface ScrapedJob {
  source: JobSource;
  sourceJobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  rawJd: string;
  postedAt: Date | null;
}
