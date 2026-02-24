"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, WizardAnswers, Persona } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  { id: "outdoors", label: "Outdoors", icon: "🏔️" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "cooking", label: "Cooking", icon: "🍳" },
  { id: "automotive", label: "Automotive", icon: "🚗" },
  { id: "fashion", label: "Fashion", icon: "👗" },
  { id: "tech", label: "Tech", icon: "💻" },
  { id: "health", label: "Health", icon: "🏃" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "pets", label: "Pets", icon: "🐾" },
  { id: "DIY", label: "DIY", icon: "🔨" },
];

const AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
];

const US_STATES = [
  "random",
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const SHOPPING_STYLES = [
  {
    id: "budget",
    label: "Budget",
    description: "Always hunting for deals and discounts",
    icon: "🏷️",
  },
  {
    id: "midrange",
    label: "Mid-Range",
    description: "Quality items at reasonable prices",
    icon: "⚖️",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Premium brands and high-end products",
    icon: "✨",
  },
  {
    id: "window_shopper",
    label: "Window Shopper",
    description: "Browses a lot, rarely buys",
    icon: "👀",
  },
];

const NOISE_LEVELS = [
  {
    id: "subtle",
    label: "Subtle",
    description:
      "Light background noise. Occasional searches and page views that blend in naturally.",
    percentage: 25,
  },
  {
    id: "moderate",
    label: "Moderate",
    description:
      "Regular phantom activity. A consistent mix of browsing, searching, and interactions.",
    percentage: 55,
  },
  {
    id: "heavy",
    label: "Heavy",
    description:
      "Maximum noise generation. Aggressive decoy activity across all channels.",
    percentage: 90,
  },
];

const TOTAL_STEPS = 5;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
              i < currentStep
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                : i === currentStep
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25 ring-4 ring-violet-500/20"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {i < currentStep ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                i < currentStep ? "bg-violet-600" : "bg-slate-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Interests ────────────────────────────────────────────────────────

function StepInterests({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (interests: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100">
        Choose interests for your phantom
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Select the topics your phantom persona will be interested in. Pick at
        least 2.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest.id);
          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggle(interest.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <span className="text-2xl">{interest.icon}</span>
              <span
                className={`text-sm font-medium ${
                  isSelected ? "text-violet-300" : "text-slate-300"
                }`}
              >
                {interest.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {selected.length} selected {selected.length < 2 && "(need at least 2)"}
      </p>
    </div>
  );
}

// ─── Step 2: Demographics ─────────────────────────────────────────────────────

function StepDemographics({
  ageRange,
  location,
  profession,
  onAgeChange,
  onLocationChange,
  onProfessionChange,
}: {
  ageRange: string;
  location: string;
  profession: string;
  onAgeChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onProfessionChange: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100">
        Demographics
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Set the demographic profile for your phantom persona.
      </p>

      <div className="mt-6 space-y-6">
        {/* Age Range */}
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Age Range
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGE_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onAgeChange(range)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  ageRange === range
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-slate-300"
          >
            Location
          </label>
          <select
            id="location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="input-field mt-2 appearance-none"
          >
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state === "random" ? "Random (let Phantom choose)" : state}
              </option>
            ))}
          </select>
        </div>

        {/* Profession */}
        <div>
          <label
            htmlFor="profession"
            className="block text-sm font-medium text-slate-300"
          >
            Profession
          </label>
          <input
            id="profession"
            type="text"
            value={profession}
            onChange={(e) => onProfessionChange(e.target.value)}
            placeholder="e.g., software engineer, teacher, nurse..."
            className="input-field mt-2"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Shopping Style ───────────────────────────────────────────────────

function StepShoppingStyle({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (style: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100">
        Shopping style
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        How does your phantom shop online?
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SHOPPING_STYLES.map((style) => {
          const isSelected = selected === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              className={`flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <span className="text-2xl">{style.icon}</span>
              <div>
                <p
                  className={`font-semibold ${
                    isSelected ? "text-violet-300" : "text-slate-200"
                  }`}
                >
                  {style.label}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {style.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Noise Intensity ──────────────────────────────────────────────────

function StepNoiseIntensity({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (level: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100">
        Noise intensity
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        How much decoy activity should your phantom generate?
      </p>

      <div className="mt-6 space-y-3">
        {NOISE_LEVELS.map((level) => {
          const isSelected = selected === level.id;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onChange(level.id)}
              className={`w-full rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-lg font-semibold ${
                      isSelected ? "text-violet-300" : "text-slate-200"
                    }`}
                  >
                    {level.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {level.description}
                  </p>
                </div>
                {/* Mini gauge */}
                <div className="ml-4 flex shrink-0 flex-col items-center">
                  <div className="relative h-2 w-24 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        isSelected ? "bg-violet-500" : "bg-slate-600"
                      }`}
                      style={{ width: `${level.percentage}%` }}
                    />
                  </div>
                  <span className="mt-1 text-xs text-slate-500">
                    {level.percentage}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Generating / Result ──────────────────────────────────────────────

function StepResult({
  persona,
  generating,
  error,
  onActivate,
  onRegenerate,
}: {
  persona: Persona | null;
  generating: boolean;
  error: string | null;
  onActivate: () => void;
  onRegenerate: () => void;
}) {
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-violet-500" />
        </div>
        <p className="mt-6 text-lg font-medium text-slate-200">
          Generating your phantom...
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Building a unique persona based on your selections
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="mt-4 text-lg font-medium text-slate-200">
          Something went wrong
        </p>
        <p className="mt-2 text-sm text-red-400">{error}</p>
        <button onClick={onRegenerate} className="btn-primary mt-6">
          Try Again
        </button>
      </div>
    );
  }

  if (!persona) return null;

  const interests =
    persona.profile?.interests ?? persona.wizard_answers?.interests ?? [];
  const location =
    persona.profile?.location ?? persona.wizard_answers?.location ?? "";
  const profession =
    persona.profile?.profession ?? persona.wizard_answers?.profession ?? "";
  const shoppingStyle =
    persona.profile?.shopping_style ?? persona.wizard_answers?.shopping_style ?? "";
  const noiseIntensity =
    persona.profile?.noise_intensity ?? persona.wizard_answers?.noise_intensity ?? "";

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-2xl font-bold text-white shadow-lg shadow-violet-500/30">
          {persona.name?.[0]?.toUpperCase() ?? "P"}
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-100">
          {persona.name}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Your phantom persona is ready
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Location
            </p>
            <p className="mt-1 text-sm text-slate-200">{location}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Profession
            </p>
            <p className="mt-1 text-sm text-slate-200">{profession}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Shopping Style
            </p>
            <p className="mt-1 text-sm capitalize text-slate-200">
              {shoppingStyle.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Noise Level
            </p>
            <p className="mt-1 text-sm capitalize text-slate-200">
              {noiseIntensity}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Interests
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((interest: string) => (
              <span key={interest} className="tag">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button onClick={onRegenerate} className="btn-secondary">
          Regenerate
        </button>
        <button onClick={onActivate} className="btn-primary">
          Activate Persona
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function PersonaWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  // Form state
  const [interests, setInterests] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState("25-34");
  const [location, setLocation] = useState("random");
  const [profession, setProfession] = useState("");
  const [shoppingStyle, setShoppingStyle] = useState("");
  const [noiseIntensity, setNoiseIntensity] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAdvance = useCallback(() => {
    switch (step) {
      case 0:
        return interests.length >= 2;
      case 1:
        return ageRange && location && profession.trim();
      case 2:
        return !!shoppingStyle;
      case 3:
        return !!noiseIntensity;
      default:
        return false;
    }
  }, [step, interests, ageRange, location, profession, shoppingStyle, noiseIntensity]);

  const buildAnswers = useCallback((): WizardAnswers => {
    return {
      interests,
      age_range: ageRange,
      location,
      profession: profession.trim(),
      shopping_style: shoppingStyle,
      noise_intensity: noiseIntensity,
    };
  }, [interests, ageRange, location, profession, shoppingStyle, noiseIntensity]);

  const generatePersona = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.createPersona(buildAnswers());
      setPersona(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create persona");
    } finally {
      setGenerating(false);
    }
  }, [buildAnswers]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setSlideDirection("right");
      const nextStep = step + 1;
      setStep(nextStep);
      // Trigger generation when entering step 5
      if (nextStep === 4) {
        generatePersona();
      }
    }
  }, [step, generatePersona]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setSlideDirection("left");
      setStep(step - 1);
    }
  }, [step]);

  const handleActivate = async () => {
    if (!persona) return;
    try {
      await api.updatePersona(persona.id, { is_active: true });
      router.push(`/personas/${persona.id}`);
    } catch (err) {
      console.error("Failed to activate persona:", err);
    }
  };

  const handleRegenerate = () => {
    setPersona(null);
    setError(null);
    generatePersona();
  };

  const animationClass =
    slideDirection === "right" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="mt-8">
        <div key={step} className={animationClass}>
          {step === 0 && (
            <StepInterests selected={interests} onChange={setInterests} />
          )}
          {step === 1 && (
            <StepDemographics
              ageRange={ageRange}
              location={location}
              profession={profession}
              onAgeChange={setAgeRange}
              onLocationChange={setLocation}
              onProfessionChange={setProfession}
            />
          )}
          {step === 2 && (
            <StepShoppingStyle
              selected={shoppingStyle}
              onChange={setShoppingStyle}
            />
          )}
          {step === 3 && (
            <StepNoiseIntensity
              selected={noiseIntensity}
              onChange={setNoiseIntensity}
            />
          )}
          {step === 4 && (
            <StepResult
              persona={persona}
              generating={generating}
              error={error}
              onActivate={handleActivate}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-700/50 pt-6">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="btn-secondary disabled:invisible"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <button
            onClick={goNext}
            disabled={!canAdvance()}
            className="btn-primary"
          >
            {step === 3 ? "Generate Phantom" : "Continue"}
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
