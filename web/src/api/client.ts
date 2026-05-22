const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("specter_token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("specter_token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("specter_token");
    localStorage.removeItem("specter_refresh");
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (resp.status === 401) {
      this.clearToken();
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    if (resp.status === 204) {
      return undefined as T;
    }

    const data = await resp.json();

    if (!resp.ok) {
      throw new ApiError(resp.status, data.detail || "Request failed");
    }

    return data as T;
  }

  // Auth
  async register(orgName: string, name: string, email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ org_name: orgName, name, email, password }),
      }
    );
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  }

  // Health
  async health() {
    return this.request<{
      status: string;
      version: string;
      database: string;
      environment: string;
    }>("/health");
  }

  // Campaigns
  async getCampaigns(page = 1) {
    return this.request<{
      campaigns: Campaign[];
      total: number;
      page: number;
      page_size: number;
    }>(`/campaigns?page=${page}`);
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    vectors?: string[];
  }) {
    return this.request<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string) {
    return this.request<void>(`/campaigns/${id}`, { method: "DELETE" });
  }

  // Target Groups
  async getGroups() {
    return this.request<TargetGroup[]>("/groups");
  }

  async createGroup(name: string, description?: string) {
    return this.request<TargetGroup>("/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  // Simulations
  async quickSimulate(vector: string, topic: string, tone = "urgent") {
    return this.request<SimulationResult>("/simulations/quick", {
      method: "POST",
      body: JSON.stringify({ vector, topic, tone }),
    });
  }

  async getSimulations() {
    return this.request<Simulation[]>("/simulations");
  }

  async getVectors() {
    return this.request<VectorInfo[]>("/simulations/vectors");
  }

  // Metrics
  async getMetrics() {
    return this.request<MetricsData>("/metrics");
  }
}

// Types
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  vectors: string[] | null;
  target_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TargetGroup {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export interface Simulation {
  id: string;
  campaign_id: string;
  target_user_id: string;
  vector: string;
  difficulty_tier: string;
  status: string;
  created_at: string;
}

export interface SimulationResult {
  simulation_id: string;
  vector: string;
  tracking_token: string;
  tracking_url: string;
  training_url: string;
  content: Record<string, unknown>;
  red_flags: string[];
  social_engineering_tactics: string[];
}

export interface VectorInfo {
  type: string;
  requires_pro: boolean;
  tier: string;
}

export interface MetricsData {
  app: string;
  version: string;
  total_requests: number;
  active_requests: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  status_codes: Record<string, number>;
  endpoints: Record<string, { count: number; avg_ms: number }>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const api = new ApiClient();
export { ApiError };
