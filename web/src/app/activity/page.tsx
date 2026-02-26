"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ActivityEntry } from "@/lib/api";
import ActivityFeed from "@/components/ActivityFeed";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    api
      .getActivity()
      .then(setActivities)
      .catch((err) => console.error("Failed to load activity:", err))
      .finally(() => setLoading(false));
  }, []);

  const actionTypes = [
    "all",
    ...Array.from(new Set(activities.map((a) => a.action_type))),
  ];

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((a) => a.action_type === filter);

  const completedCount = activities.filter(
    (a) => a.status === "completed"
  ).length;
  const pendingCount = activities.filter(
    (a) => a.status === "pending"
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200">
              Dashboard
            </Link>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
            <span className="text-slate-200">Activity</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Activity Log
          </h1>
          <p className="mt-2 text-slate-400">
            Track all phantom decoy actions across your personas.
          </p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
            <svg
              className="h-5 w-5 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">
              {activities.length}
            </p>
            <p className="text-xs text-slate-400">Total Actions</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">
              {completedCount}
            </p>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
            <svg
              className="h-5 w-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">{pendingCount}</p>
            <p className="text-xs text-slate-400">Pending</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      {actionTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {actionTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all duration-200 ${
                filter === type
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {type}
              {type !== "all" && (
                <span className="ml-1.5 text-xs opacity-60">
                  {activities.filter((a) => a.action_type === type).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Activity feed */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        <ActivityFeed activities={filteredActivities} loading={loading} />
      </div>
    </div>
  );
}
