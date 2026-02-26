"use client";

import Link from "next/link";
import { Persona, api } from "@/lib/api";
import { useState } from "react";

interface PersonaCardProps {
  persona: Persona;
  onToggle?: (persona: Persona) => void;
}

export default function PersonaCard({ persona, onToggle }: PersonaCardProps) {
  const [isActive, setIsActive] = useState(persona.is_active);
  const [toggling, setToggling] = useState(false);

  const interests =
    persona.profile?.interests ?? persona.wizard_answers?.interests ?? [];
  const location =
    persona.profile?.location ?? persona.wizard_answers?.location ?? "Unknown";
  const noiseIntensity =
    persona.profile?.noise_intensity ??
    persona.wizard_answers?.noise_intensity ??
    "moderate";

  const intensityColors: Record<string, string> = {
    subtle: "bg-emerald-500/15 text-emerald-400",
    moderate: "bg-amber-500/15 text-amber-400",
    heavy: "bg-red-500/15 text-red-400",
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggling) return;

    setToggling(true);
    try {
      const updated = await api.updatePersona(persona.id, {
        is_active: !isActive,
      });
      setIsActive(updated.is_active);
      onToggle?.(updated);
    } catch (err) {
      console.error("Failed to toggle persona:", err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link href={`/personas/${persona.id}`}>
      <div className="card group cursor-pointer transition-all duration-200 hover:border-slate-600 hover:shadow-lg hover:shadow-violet-500/5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {/* Avatar circle */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isActive
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {persona.name?.[0]?.toUpperCase() ?? "P"}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-100 group-hover:text-white">
                  {persona.name}
                </h3>
                <p className="text-xs text-slate-400">{location}</p>
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
              isActive ? "bg-violet-600" : "bg-slate-600"
            } ${toggling ? "opacity-50" : ""}`}
            aria-label={isActive ? "Deactivate persona" : "Activate persona"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Interests tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {interests.slice(0, 4).map((interest) => (
            <span key={interest} className="tag">
              {interest}
            </span>
          ))}
          {interests.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs text-slate-400">
              +{interests.length - 4}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              intensityColors[noiseIntensity] ??
              "bg-slate-700/50 text-slate-400"
            }`}
          >
            {noiseIntensity} noise
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              isActive ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </Link>
  );
}
