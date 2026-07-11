// Shared constants and domain types for JobPilot.

export const APP_NAME = "JobPilot";
export const APP_TAGLINE = "An AI job-search copilot";

export type Health = {
  ok: boolean;
  service: string;
};

export * from "./types";
export * from "./matching";
