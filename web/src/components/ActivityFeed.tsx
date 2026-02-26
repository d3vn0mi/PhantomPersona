"use client";

import { ActivityEntry } from "@/lib/api";

interface ActivityFeedProps {
  activities: ActivityEntry[];
  loading?: boolean;
}

const actionIcons: Record<string, string> = {
  search: "magnifying-glass",
  browse: "globe",
  purchase: "shopping-cart",
  click: "cursor",
  view: "eye",
};

function ActionIcon({ type }: { type: string }) {
  const baseClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";

  switch (type.toLowerCase()) {
    case "search":
      return (
        <div className={`${baseClass} bg-blue-500/15`}>
          <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
      );
    case "browse":
      return (
        <div className={`${baseClass} bg-emerald-500/15`}>
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
      );
    case "purchase":
      return (
        <div className={`${baseClass} bg-violet-500/15`}>
          <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
      );
    case "click":
      return (
        <div className={`${baseClass} bg-amber-500/15`}>
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
          </svg>
        </div>
      );
    default:
      return (
        <div className={`${baseClass} bg-slate-700`}>
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
      );
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-700" />
        <div className="h-3 w-1/2 rounded bg-slate-700" />
      </div>
      <div className="h-3 w-12 rounded bg-slate-700" />
    </div>
  );
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="divide-y divide-slate-700/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
          <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-300">No activity yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Activate a persona to start generating phantom activity.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700/50">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-800/50"
        >
          <ActionIcon type={activity.action_type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-200">
              {activity.description}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs font-medium text-violet-400">
                {activity.persona_name}
              </span>
              <span className="text-slate-600">&middot;</span>
              <span className="text-xs text-slate-500 capitalize">
                {activity.action_type}
              </span>
              {activity.url && (
                <>
                  <span className="text-slate-600">&middot;</span>
                  <span className="max-w-[200px] truncate text-xs text-slate-500">
                    {activity.url}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                activity.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : activity.status === "pending"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-slate-700/50 text-slate-400"
              }`}
            >
              {activity.status}
            </span>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {formatTimeAgo(activity.completed_at ?? activity.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
