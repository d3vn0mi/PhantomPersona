"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Persona } from "@/lib/api";
import NoiseScore from "@/components/NoiseScore";

export default function PersonaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api
      .getPersona(id)
      .then(setPersona)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleActive = async () => {
    if (!persona || toggling) return;
    setToggling(true);
    try {
      const updated = await api.updatePersona(persona.id, {
        is_active: !persona.is_active,
      });
      setPersona(updated);
    } catch (err) {
      console.error("Failed to toggle:", err);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!persona || deleting) return;
    setDeleting(true);
    try {
      await api.deletePersona(persona.id);
      router.push("/");
    } catch (err) {
      console.error("Failed to delete:", err);
      setDeleting(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!persona || generating) return;
    setGenerating(true);
    try {
      await api.generatePlan(persona.id);
    } catch (err) {
      console.error("Failed to generate plan:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-6 w-24 animate-pulse rounded bg-slate-700" />
        <div className="mt-6 card animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-700" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded bg-slate-700" />
              <div className="h-4 w-32 rounded bg-slate-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="mt-4 text-lg font-medium text-slate-200">
          Persona not found
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {error ?? "This persona does not exist or has been deleted."}
        </p>
        <Link href="/" className="btn-primary mt-6">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const interests =
    persona.profile?.interests ?? persona.wizard_answers?.interests ?? [];
  const location =
    persona.profile?.location ?? persona.wizard_answers?.location ?? "Unknown";
  const profession =
    persona.profile?.profession ?? persona.wizard_answers?.profession ?? "N/A";
  const ageRange =
    persona.profile?.age_range ?? persona.wizard_answers?.age_range ?? "N/A";
  const shoppingStyle =
    persona.profile?.shopping_style ??
    persona.wizard_answers?.shopping_style ??
    "N/A";
  const noiseIntensity =
    persona.profile?.noise_intensity ??
    persona.wizard_answers?.noise_intensity ??
    "moderate";

  const intensityScores: Record<string, number> = {
    subtle: 25,
    moderate: 55,
    heavy: 90,
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Breadcrumb */}
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
        <span className="text-slate-200">{persona.name}</span>
      </div>

      {/* Header card */}
      <div className="card">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${
                persona.is_active
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {persona.name?.[0]?.toUpperCase() ?? "P"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                {persona.name}
              </h1>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    persona.is_active ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      persona.is_active
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-slate-500"
                    }`}
                  />
                  {persona.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-sm text-slate-400">
                  Created{" "}
                  {new Date(persona.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={
                persona.is_active ? "btn-secondary" : "btn-primary"
              }
            >
              {toggling && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {persona.is_active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="btn-primary"
            >
              {generating ? (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
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
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              )}
              Generate Plan
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger"
            >
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
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Profile details grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Profile info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-100">
              Profile Details
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Age Range
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {ageRange}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Location
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {location}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Profession
                </p>
                <p className="mt-1 text-sm font-medium text-slate-200">
                  {profession}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Shopping Style
                </p>
                <p className="mt-1 text-sm font-medium capitalize text-slate-200">
                  {String(shoppingStyle).replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-100">Interests</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest: string) => (
                <span
                  key={interest}
                  className="inline-flex items-center rounded-lg bg-violet-500/15 px-3 py-1.5 text-sm font-medium text-violet-300"
                >
                  {interest}
                </span>
              ))}
              {interests.length === 0 && (
                <p className="text-sm text-slate-500">No interests set</p>
              )}
            </div>
          </div>

          {/* Extra profile fields if present */}
          {persona.profile && (
            <div className="card">
              <h2 className="text-lg font-semibold text-slate-100">
                Extended Profile
              </h2>
              <div className="mt-4 space-y-4">
                {!!persona.profile.daily_routine && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Daily Routine
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {String(persona.profile.daily_routine)}
                    </p>
                  </div>
                )}
                {Array.isArray(persona.profile.search_topics) && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Search Topics
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(persona.profile.search_topics as string[]).map(
                        (topic: string) => (
                          <span
                            key={topic}
                            className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs text-blue-300"
                          >
                            {topic}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
                {Array.isArray(persona.profile.shopping_interests) && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Shopping Interests
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(persona.profile.shopping_interests as string[]).map(
                        (item: string) => (
                          <span
                            key={item}
                            className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300"
                          >
                            {item}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Noise gauge + status */}
        <div className="space-y-6">
          <div className="card flex flex-col items-center py-8">
            <NoiseScore
              score={intensityScores[noiseIntensity] ?? 50}
              size="lg"
              label="Noise Intensity"
            />
            <p className="mt-4 text-sm capitalize text-slate-400">
              {noiseIntensity} mode
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-slate-100">
              Quick Info
            </h3>
            <dl className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-slate-400">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      persona.is_active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        persona.is_active
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                    {persona.is_active ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-slate-400">Created</dt>
                <dd className="text-xs text-slate-300">
                  {new Date(persona.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs text-slate-400">ID</dt>
                <dd className="max-w-[120px] truncate text-xs font-mono text-slate-500">
                  {persona.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-scale-in card mx-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Delete Persona
                </h3>
                <p className="text-sm text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{persona.name}</span>?
              All associated data and activity history will be permanently
              removed.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
