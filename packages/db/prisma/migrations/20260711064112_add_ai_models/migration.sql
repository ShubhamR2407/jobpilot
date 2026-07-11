-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEnrichment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "seniority" TEXT,
    "minYears" INTEGER,
    "stack" TEXT[],
    "remotePolicy" TEXT,
    "responsibilities" TEXT[],
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitScore" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchedSkills" TEXT[],
    "gaps" TEXT[],
    "rationale" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobEnrichment_jobId_key" ON "JobEnrichment"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "FitScore_jobId_key" ON "FitScore"("jobId");

-- AddForeignKey
ALTER TABLE "JobEnrichment" ADD CONSTRAINT "JobEnrichment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitScore" ADD CONSTRAINT "FitScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
