import jobsData from "./jobs.json";

export interface Job {
  slug: string;
  jobId: string | null;
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  location: string;
  applyUrl: string;
  companyName: string;
  companySlug: string;
  dateRaw: string;
  dateISO: string;
  detailUrl: string;
  scrapedAt: string;
}

const raw = jobsData as {
  generatedAt: string;
  totalJobs: number;
  jobs: Job[];
};

export const jobs: Job[] = raw.jobs;
export const totalJobsCount = raw.totalJobs;
export const jobsGeneratedAt = raw.generatedAt;

export function getJobBySlug(slug: string): Job | undefined {
  return jobs.find((j) => j.slug === slug);
}

export function getRecentJobs(count = 10): Job[] {
  return jobs.slice(0, count);
}

/** Format date for display: "April 6, 2026" */
export function formatJobDate(job: Job): string {
  if (!job.dateISO) return job.dateRaw;
  const [y, m, d] = job.dateISO.substring(0, 10).split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}
