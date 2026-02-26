import PersonaWizard from "@/components/PersonaWizard";

export default function NewPersonaPage() {
  return (
    <div className="animate-fade-in py-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-100">
          Create a Phantom Persona
        </h1>
        <p className="mt-2 text-slate-400">
          Build a unique decoy identity in a few simple steps.
        </p>
      </div>
      <PersonaWizard />
    </div>
  );
}
