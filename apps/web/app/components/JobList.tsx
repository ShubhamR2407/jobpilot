"use client";

import { useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { JobDTO } from "../lib/jobs";
import { JobCard } from "./JobCard";

// Window-virtualized list: only the visible cards are in the DOM, so a long
// results list stays fast (better LCP/INP). Cards are variable-height, so we
// let the virtualizer measure each rendered element.
export function JobList({ jobs }: { jobs: JobDTO[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count: jobs.length,
    estimateSize: () => 190,
    overscan: 6,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <div
      ref={listRef}
      role="list"
      style={{ height: virtualizer.getTotalSize(), position: "relative" }}
    >
      {virtualizer.getVirtualItems().map((vi) => {
        const job = jobs[vi.index];
        if (!job) return null;
        return (
          <div
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vi.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            <div className="pb-3">
              <JobCard job={job} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
