import "../loadenv.js";
import { prisma } from "@jobpilot/db";

// Shubham's résumé — the target every job is scored against. Plain-text form of
// the current résumé (~/JobAlert/resume/resume.tex). Keep in sync when the résumé changes.
const RESUME = `Shubham Rathore — Software Engineer (~3 years experience).
Target roles: backend, frontend, and full-stack (Node.js / React / Next.js + AWS).

TECHNICAL SKILLS
Languages: TypeScript, JavaScript (ES6+), SQL, Java, HTML5, CSS3.
Frontend: React.js, Next.js, Redux Toolkit, TanStack (React) Query, Tailwind CSS, Material UI, responsive design, Jest, Vitest.
Backend: Node.js, Express.js, REST & GraphQL APIs, BullMQ, Redis, Prisma (ORM), PostgreSQL, MongoDB, JWT/Auth, WebSockets.
Cloud & DevOps: AWS (Lambda, SQS, API Gateway, ECS, EC2, S3, RDS, Textract, CloudWatch), Docker, GitHub Actions, Vercel, CI/CD.
Practices & AI: system design, event-driven architecture, asynchronous processing, AI integration, AI-assisted development, prompt engineering, Git, Agile, code reviews.

EXPERIENCE
Software Engineer, Memorres Digital Pvt. Ltd. (Oct 2023 – present), Jaipur.
- Led end-to-end development of 5+ SaaS products serving 50,000+ users, owning frontend, backend, database design, cloud deployments, and production support.
- Built 100+ REST APIs and designed scalable database architectures powering complex business workflows across multiple production applications.
- Architected asynchronous worker-based systems processing 10,000+ records per upload, automating employee onboarding, assessments, notifications, and bulk operations.
- Implemented event-driven workflows and AWS Lambda-based report generation, enabling concurrent processing of large-scale assessment and analytics reports.
- Built an automated bloodwork-analysis platform using AWS Textract, extracting/validating 200+ biomarkers and reducing report generation from hours to 5–6 seconds.
- Led a cross-functional team of 3–4 engineers, driving technical decisions, code reviews, sprint execution, and feature delivery.

PROJECTS
JobPilot — AI-Powered Job Search Copilot (live): Next.js, TypeScript, Node.js, PostgreSQL, Prisma, Redis, BullMQ, Anthropic Claude API, GitHub Actions, Vercel.
- Full-stack AI job platform (TypeScript monorepo) that ingests and LLM-scores 1,000+ postings from company ATS feeds.
- Tiered LLM pipeline (Haiku/Sonnet/Opus) with JSON-schema structured outputs and prompt caching to cut repeat-scoring token cost.
- Resilient async ingestion engine using BullMQ + Redis with unique-constraint upserts, orchestrated via a scheduled GitHub Action (15-min polling).
- High-performance frontend with TanStack Query, list virtualization, optimistic UI updates, and a drag-drop Kanban dashboard.
- End-to-end type safety across monorepo boundaries, Vitest unit tests, and full CI/CD automation.

Enterprise Team Assessment Platform (B2B SaaS): Node.js, Express.js, PostgreSQL, AWS (SQS, Lambda, S3), JWT, SendGrid, Puppeteer.
- Multi-tenant assessment platform serving 100+ organizations and thousands of employees across assessment, reporting, and workforce-analytics workflows.
- Event-driven asynchronous workflows processing 10,000+ records per upload; AWS Lambda report generation; secure APIs and relational data models.

EDUCATION
B.Tech, Rajasthan Technical University of Kota (2019–2023), CGPA 8.35/10.

Also: 700+ DSA problems across LeetCode/CodeChef/GeeksforGeeks.`;

async function main(): Promise<void> {
  await prisma.resume.deleteMany({});
  const r = await prisma.resume.create({
    data: { content: RESUME, active: true },
  });
  console.log(`résumé seeded (id ${r.id}, ${RESUME.length} chars)`);
  await prisma.$disconnect();
  process.exit(0);
}

main();
