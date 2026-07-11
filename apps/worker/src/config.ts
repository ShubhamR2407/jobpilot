// Ingestion config, ported from the Python JobAlert config.yaml.
// Tuned to Shubham's résumé: MERN (Node/Express/React/Next.js) + AWS full-stack,
// ~3 yrs experience. A curated subset of the original company list — expand freely
// (full list lives in ~/JobAlert/config.yaml).

export const MAX_EXPERIENCE_YEARS = 4;

/** A job matches if its TITLE contains any of these (case-insensitive). */
export const KEYWORDS: readonly string[] = [
  "Full Stack",
  "Fullstack",
  "Full-Stack",
  "MERN",
  "Node",
  "React",
  "Next.js",
  "Frontend",
  "Front End",
  "Front-End",
  "Backend",
  "Back End",
  "Javascript",
  "Typescript",
  "Software Engineer",
  "Software Development Engineer",
  "SDE",
  "Web Developer",
];

/** Drop a job if its TITLE contains any of these (seniority / off-stack noise). */
export const EXCLUDE_TITLE_KEYWORDS: readonly string[] = [
  "staff",
  "principal",
  "lead",
  "director",
  "architect",
  "head of",
  "manager",
  "distinguished",
  "fellow",
  "vp ",
  "president",
  "intern",
  "salesforce",
  "sap ",
  "wordpress",
  "drupal",
  "magento",
  "embedded",
  "mainframe",
  "cobol",
  "sharepoint",
  ".net developer",
  "android developer",
  "ios developer",
  "qa engineer",
  "test engineer",
  "sdet",
];

/** In "multi" mode, the always-accept allow-list (India + named target hubs). */
export const LOCATIONS: readonly string[] = [
  "India",
  "Bengaluru",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Gurgaon",
  "Gurugram",
  "Noida",
  "Delhi",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Indore",
  "Remote",
  "Global",
  "Worldwide",
  "Anywhere",
  "United States",
  "USA",
  "U.S.",
  "Japan",
  "Tokyo",
  "Europe",
  "United Kingdom",
  "London",
  "Germany",
  "Berlin",
  "Netherlands",
  "Amsterdam",
  "Ireland",
  "Dublin",
];

/** Company slugs per ATS. The slug is the last path segment of the careers URL. */
export const COMPANIES = {
  greenhouse: [
    "gitlab",
    "stripe",
    "databricks",
    "mongodb",
    "datadog",
    "cloudflare",
    "figma",
    "razorpaysoftwareprivatelimited",
    "groww",
    "postman",
  ],
  lever: ["spotify", "palantir", "cred", "meesho", "mindtickle"],
  ashby: ["openai", "notion", "supabase", "vanta", "cursor", "posthog"],
} as const;
