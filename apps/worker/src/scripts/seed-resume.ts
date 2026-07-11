import "../loadenv.js";
import { prisma } from "@jobpilot/db";

// Shubham's résumé — the target every job is scored against. Plain-text form of
// the current résumé (see ~/JobAlert/resume/resume.tex).
const RESUME = `Shubham Rathore — Full Stack Software Engineer (~3 years experience).
Targeting backend, frontend, and full-stack roles (MERN + AWS).

TECHNICAL SKILLS
Languages: TypeScript, JavaScript (ES6+), SQL, Java, HTML5, CSS3.
Frontend: React.js, Next.js, Redux Toolkit, React Query, Tailwind CSS, Material UI, responsive design, web accessibility (a11y).
Backend: Node.js, Express.js, REST & GraphQL APIs, PostgreSQL, MongoDB, Redis, Prisma (ORM), JWT/Auth, WebSockets, event-driven & asynchronous processing.
Cloud & DevOps: AWS (Lambda, SQS, API Gateway, ECS, EC2, S3, RDS, Textract, CloudWatch), Docker, CI/CD, GitHub Actions.
Testing & Practices: Jest, React Testing Library, system design, TDD, code reviews, Agile.

EXPERIENCE
Software Engineer, Memorres Digital Pvt. Ltd. (Oct 2023 – present).
- Built and shipped backend services for HR-tech and healthcare SaaS using Node.js and TypeScript: REST API design, PostgreSQL schema design, AWS deployments through production support.
- Built an automated bloodwork-analysis platform using AWS Textract, extracting/validating 200+ biomarkers and cutting report turnaround from hours to 5–6 seconds.
- Designed asynchronous worker pipelines (AWS SQS + background workers) processing 10,000+ records per bulk upload for onboarding, notifications, and assessment scoring.
- Implemented AWS Lambda-based report generation enabling concurrent large-report creation.
- Built production React/Next.js + TypeScript frontends — data-heavy analytics dashboards and admin tooling with React Query.
- Coordinated a team of 3–4 engineers as technical lead (code reviews, sprint planning, technical decisions).

PROJECTS
Team Assessment Platform (Multi-Tenant B2B SaaS): Node.js, Express.js, PostgreSQL, AWS (SQS, Lambda, S3), JWT, SendGrid, Puppeteer. Multi-tenant data model, RBAC, PDF report rendering, SQS-orchestrated bulk onboarding with retries.

EDUCATION
B.Tech, Rajasthan Technical University of Kota (2019–2023), CGPA 8.35/10.`;

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
