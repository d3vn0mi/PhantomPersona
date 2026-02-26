"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Persona, ActivityEntry } from "@/lib/api";
import PersonaCard from "@/components/PersonaCard";
import ActivityFeed from "@/components/ActivityFeed";
import NoiseScore from "@/components/NoiseScore";

export default function DashboardPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [personaResult, activityResult] = await Promise.allSettled([
          api.getPersonas(),
          api.getActivity(),
        ]);
        if (personaResult.status === "fulfilled")
          setPersonas(personaResult.value);
        if (activityResult.status === "fulfilled")
          setActivities(activityResult.value);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = personas.filter((p) => p.is_active).length;
  const completedActions = activities.filter(
    (a) => a.status === "completed"
  ).length;

  // Calculate a noise score based on active personas and their noise intensity
  const noiseScore = (() => {
    if (personas.length === 0) return 0;
    const activePersonas = personas.filter((p) => p.is_active);
    if (activePersonas.length === 0) return 0;
    const intensityWeights: Record<string, number> = {
      subtle: 25,
      moderate: 55,
      heavy: 90,
    };
    const total = activePersonas.reduce((sum, p) => {
      const intensity =
        p.profile?.noise_intensity ??
        p.wizard_answers?.noise_intensity ??
        "moderate";
      return sum + (intensityWeights[intensity] ?? 50);
    }, 0);
    return Math.round(total / activePersonas.length);
  })();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-slate-700" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-700" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-1/2 rounded bg-slate-700" />
              <div className="mt-3 h-3 w-3/4 rounded bg-slate-700" />
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-700" />
                <div className="h-5 w-16 rounded-full bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Manage your phantom personas and monitor decoy activity.
          </p>
        </div>
        <Link href="/personas/new" className="btn-primary">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Persona
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/15">
            <svg
              className="h-6 w-6 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">
              {personas.length}
            </p>
            <p className="text-xs text-slate-400">Total Personas</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/15">
            <svg
              className="h-6 w-6 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">{activeCount}</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15">
            <svg
              className="h-6 w-6 text-amber-400"
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
            <p className="text-2xl font-bold text-slate-100">
              {completedActions}
            </p>
            <p className="text-xs text-slate-400">Actions Completed</p>
          </div>
        </div>

        <div className="card flex items-center justify-center">
          <NoiseScore score={noiseScore} size="sm" label="Noise Level" />
        </div>
      </div>

      {/* Personas grid */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Your Personas
          </h2>
          {personas.length > 0 && (
            <Link
              href="/personas/new"
              className="text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              Create another
            </Link>
          )}
        </div>

        {personas.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-300">
              No phantom personas yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first persona to start generating decoy activity.
            </p>
            <Link href="/personas/new" className="btn-primary mt-6">
              Create Your First Phantom
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onToggle={(updated) => {
                  setPersonas((prev) =>
                    prev.map((p) => (p.id === updated.id ? updated : p))
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Recent Activity
          </h2>
          {activities.length > 0 && (
            <Link
              href="/activity"
              className="text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              View all
            </Link>
          )}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <ActivityFeed activities={activities.slice(0, 8)} />
        </div>
      </div>
    </div>
  );
}
