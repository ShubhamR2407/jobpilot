// Shared constants and domain types for JobPilot.
// Domain models (Job, FitScore, Application, …) land here in Step 1+.

export const APP_NAME = "JobPilot";
export const APP_TAGLINE = "An AI job-search copilot";

export type Health = {
  ok: boolean;
  service: string;
};
