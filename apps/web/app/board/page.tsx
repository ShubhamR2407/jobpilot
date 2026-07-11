"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  fetchJobs,
  setStatus,
  STATUSES,
  type JobDTO,
  type ApplicationStatus,
} from "../lib/jobs";
import { ScoreBadge } from "../components/ScoreBadge";

const BOARD_KEY = ["jobs", { saved: true, sort: "score" }];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export default function Board() {
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const { data: jobs } = useQuery({
    queryKey: BOARD_KEY,
    queryFn: () => fetchJobs({ saved: true, sort: "score" }),
  });

  const move = useMutation({
    mutationFn: (v: { jobId: string; status: ApplicationStatus }) =>
      setStatus(v.jobId, v.status),
    onMutate: async ({ jobId, status }) => {
      await qc.cancelQueries({ queryKey: BOARD_KEY });
      const prev = qc.getQueryData<JobDTO[]>(BOARD_KEY);
      qc.setQueryData<JobDTO[]>(BOARD_KEY, (old) =>
        old?.map((j) =>
          j.id === jobId ? { ...j, application: { status } } : j,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(BOARD_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function onDragEnd(e: DragEndEvent) {
    const jobId = String(e.active.id);
    const status = e.over?.id as ApplicationStatus | undefined;
    if (status && (STATUSES as readonly string[]).includes(status)) {
      move.mutate({ jobId, status });
    }
  }

  const saved = jobs ?? [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-1 text-xl font-bold">Application board</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {saved.length} saved · drag a card to change status.
      </p>

      {saved.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
          No saved jobs yet — hit{" "}
          <span className="text-neutral-300">+ Save</span> on the Dashboard.
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                jobs={saved.filter((j) => j.application?.status === status)}
              />
            ))}
          </div>
        </DndContext>
      )}
    </main>
  );
}

function Column({
  status,
  jobs,
}: {
  status: ApplicationStatus;
  jobs: JobDTO[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-40 flex-col gap-2 rounded-lg border p-2 ${
        isOver
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-neutral-800 bg-neutral-900/30"
      }`}
    >
      <header className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {STATUS_LABEL[status]}{" "}
        <span className="text-neutral-600">({jobs.length})</span>
      </header>
      {jobs.map((job) => (
        <Card key={job.id} job={job} />
      ))}
    </div>
  );
}

function Card({ job }: { job: JobDTO }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-start gap-2 rounded-md border border-neutral-800 bg-neutral-950 p-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <ScoreBadge score={job.fitScore?.score ?? null} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-200">{job.title}</p>
        <p className="truncate text-xs capitalize text-neutral-500">
          {job.company}
        </p>
      </div>
    </div>
  );
}
