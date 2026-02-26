const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface WizardAnswers {
  interests: string[];
  age_range: string;
  location: string;
  profession: string;
  shopping_style: string;
  noise_intensity: string;
}

export interface Persona {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  wizard_answers: WizardAnswers;
  profile?: {
    interests: string[];
    age_range: string;
    location: string;
    profession: string;
    shopping_style: string;
    noise_intensity: string;
    [key: string]: unknown;
  };
}

export interface Plan {
  id: string;
  persona_id: string;
  actions: PlanAction[];
  created_at: string;
}

export interface PlanAction {
  id: string;
  plan_id: string;
  action_type: string;
  description: string;
  url?: string;
  status: string;
  completed_at?: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  persona_id: string;
  persona_name: string;
  action_type: string;
  description: string;
  url?: string;
  status: string;
  completed_at?: string;
  created_at: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(
        `API error ${response.status}: ${response.statusText} - ${errorBody}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Personas
  async createPersona(wizardAnswers: WizardAnswers): Promise<Persona> {
    return this.request<Persona>("/api/personas", {
      method: "POST",
      body: JSON.stringify({ wizard_answers: wizardAnswers }),
    });
  }

  async getPersonas(): Promise<Persona[]> {
    return this.request<Persona[]>("/api/personas");
  }

  async getPersona(id: string): Promise<Persona> {
    return this.request<Persona>(`/api/personas/${id}`);
  }

  async updatePersona(
    id: string,
    data: { is_active?: boolean; name?: string }
  ): Promise<Persona> {
    return this.request<Persona>(`/api/personas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deletePersona(id: string): Promise<void> {
    return this.request<void>(`/api/personas/${id}`, {
      method: "DELETE",
    });
  }

  // Plans
  async generatePlan(personaId: string): Promise<Plan> {
    return this.request<Plan>(`/api/plans/generate/${personaId}`, {
      method: "POST",
    });
  }

  async getNextPlan(): Promise<Plan> {
    return this.request<Plan>("/api/plans/next");
  }

  async completePlan(planId: string): Promise<void> {
    return this.request<void>(`/api/plans/${planId}/complete`, {
      method: "POST",
    });
  }

  async getActivity(): Promise<ActivityEntry[]> {
    return this.request<ActivityEntry[]>("/api/plans/activity");
  }
}

export const api = new ApiClient(API_BASE);
