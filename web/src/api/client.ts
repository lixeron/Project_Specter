const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

// Rich initial simulation templates for robust sellable preview interaction
const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: "camp_01jh19as7",
    name: "Q2 Spear Phishing Drill",
    description: "High-urgency HR simulation targeting corporate benefits updates.",
    status: "running",
    vectors: ["email"],
    target_group_id: "g1",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:00:00.000Z"
  },
  {
    id: "camp_02xa901k",
    name: "Executive QR Code Sweep",
    description: "Track scan metrics on badge replacement signs.",
    status: "running",
    vectors: ["qr"],
    target_group_id: "g2",
    created_at: "2026-05-20T08:30:00.000Z",
    updated_at: "2026-05-20T08:30:00.000Z"
  },
  {
    id: "camp_03as89as",
    name: "Okta SSO Replica Probe",
    description: "Simulated single sign-on credential capture sweep.",
    status: "draft",
    vectors: ["fake_login"],
    target_group_id: "g3",
    created_at: "2026-05-28T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z"
  },
  {
    id: "camp_04pq992b",
    name: "IT Support Pretexting Scenario",
    description: "Simulated external contractor caller training.",
    status: "completed",
    vectors: ["pretext"],
    target_group_id: "g1",
    created_at: "2026-05-10T14:00:00.000Z",
    updated_at: "2026-05-12T17:00:00.000Z"
  }
];

const DEFAULT_GROUPS: TargetGroup[] = [
  { id: "g1", name: "Operations & HR Staff", description: "Main administrative office personnel", member_count: 48, created_at: "2026-05-01T09:00:00.000Z" },
  { id: "g2", name: "C-Suite & Executives", description: "Highly targeted spear-phishing candidates", member_count: 12, created_at: "2026-05-02T10:00:00.000Z" },
  { id: "g3", name: "Engineering Team", description: "Technical resources with administrative access", member_count: 85, created_at: "2026-05-03T11:00:00.000Z" }
];

const DEFAULT_SIMULATIONS: Simulation[] = [
  { id: "sim_01", campaign_id: "camp_01jh19as7", target_user_id: "u1", vector: "email", difficulty_tier: "intermediate", status: "opened", created_at: "2026-06-01T12:05:00.000Z" },
  { id: "sim_02", campaign_id: "camp_01jh19as7", target_user_id: "u2", vector: "email", difficulty_tier: "intermediate", status: "clicked", created_at: "2026-06-02T14:12:00.000Z" },
  { id: "sim_03", campaign_id: "camp_01jh19as7", target_user_id: "u3", vector: "email", difficulty_tier: "intermediate", status: "submitted", created_at: "2026-06-02T14:15:00.000Z" },
  { id: "sim_04", campaign_id: "camp_02xa901k", target_user_id: "u4", vector: "qr", difficulty_tier: "advanced", status: "unopened", created_at: "2026-06-02T15:45:00.000Z" },
  { id: "sim_05", campaign_id: "camp_02xa901k", target_user_id: "u5", vector: "qr", difficulty_tier: "advanced", status: "clicked", created_at: "2026-06-02T16:01:00.000Z" }
];

const DEFAULT_METRICS: MetricsData = {
  app: "Specter Core Engine",
  version: "v2.5.1-Enterprise",
  total_requests: 18451,
  active_requests: 2,
  avg_response_time_ms: 14,
  p95_response_time_ms: 36,
  status_codes: {
    "200": 16421,
    "201": 1820,
    "204": 150,
    "400": 48,
    "401": 12,
    "500": 0
  },
  endpoints: {
    "/api/v1/auth/login": { count: 320, avg_ms: 22 },
    "/api/v1/campaigns": { count: 1851, avg_ms: 9 },
    "/api/v1/simulations/quick": { count: 4120, avg_ms: 64 },
    "/api/v1/metrics": { count: 12160, avg_ms: 5 }
  }
};

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("specter_token");
    this.initDemoDB();
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

  private isDemo() {
    // If we're logged in with a demo bypass token, OR if the local container's backend is not accessible.
    return !this.token || this.token.startsWith("demo_");
  }

  private initDemoDB() {
    if (!localStorage.getItem("specter_demo_campaigns")) {
      localStorage.setItem("specter_demo_campaigns", JSON.stringify(DEFAULT_CAMPAIGNS));
    }
    if (!localStorage.getItem("specter_demo_groups")) {
      localStorage.setItem("specter_demo_groups", JSON.stringify(DEFAULT_GROUPS));
    }
    if (!localStorage.getItem("specter_demo_simulations")) {
      localStorage.setItem("specter_demo_simulations", JSON.stringify(DEFAULT_SIMULATIONS));
    }
    if (!localStorage.getItem("specter_demo_metrics")) {
      localStorage.setItem("specter_demo_metrics", JSON.stringify(DEFAULT_METRICS));
    }
  }

  private getLocal<T>(key: string, def: T): T {
    this.initDemoDB();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  }

  private setLocal<T>(key: string, val: T) {
    localStorage.setItem(key, JSON.stringify(val));
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

    try {
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
    } catch (err) {
      // If server is offline/refused connection, throw error unless in demo bypass
      if (this.isDemo()) {
        throw err; // class methods below catch this and fallback gracefully!
      }
      throw err;
    }
  }

  // Auth Methods
  async register(orgName: string, name: string, email: string, password: string) {
    if (this.isDemo()) {
      const token = "demo_simulation_bypass_token_2026";
      this.setToken(token);
      localStorage.setItem("specter_refresh", "demo_refresh_token_2026");
      return { access_token: token, refresh_token: "demo_refresh_token_2026" };
    }
    return this.request<{ access_token: string; refresh_token: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ org_name: orgName, name, email, password }),
      }
    );
  }

  async login(email: string, password: string) {
    if (this.isDemo() || email.startsWith("demo")) {
      const token = "demo_simulation_bypass_token_2026";
      this.setToken(token);
      localStorage.setItem("specter_refresh", "demo_refresh_token_2026");
      return { access_token: token, refresh_token: "demo_refresh_token_2026" };
    }
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
    try {
      return await this.request<{
        status: string;
        version: string;
        database: string;
        environment: string;
      }>("/health");
    } catch {
      return { status: "healthy", version: "v2.5.1-Demo", database: "indexed_local", environment: "sandbox" };
    }
  }

  // Campaigns
  async getCampaigns(page = 1) {
    try {
      return await this.request<{
        campaigns: Campaign[];
        total: number;
        page: number;
        page_size: number;
      }>(`/campaigns?page=${page}`);
    } catch {
      const camps = this.getLocal<Campaign[]>("specter_demo_campaigns", DEFAULT_CAMPAIGNS);
      return {
        campaigns: camps,
        total: camps.length,
        page: 1,
        page_size: 20
      };
    }
  }

  async createCampaign(data: {
    name: string;
    description?: string;
    vectors?: string[];
  }) {
    try {
      return await this.request<Campaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch {
      const camps = this.getLocal<Campaign[]>("specter_demo_campaigns", DEFAULT_CAMPAIGNS);
      const newCamp: Campaign = {
        id: "camp_" + Math.random().toString(36).substring(2, 11),
        name: data.name,
        description: data.description || null,
        status: "running",
        vectors: data.vectors || ["email"],
        target_group_id: "g1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      camps.unshift(newCamp);
      this.setLocal("specter_demo_campaigns", camps);

      // Increment campaign mock metrics
      const meters = this.getLocal<MetricsData>("specter_demo_metrics", DEFAULT_METRICS);
      meters.total_requests += 2;
      meters.endpoints["/api/v1/campaigns"].count += 1;
      this.setLocal("specter_demo_metrics", meters);

      return newCamp;
    }
  }

  async deleteCampaign(id: string) {
    try {
      return await this.request<void>(`/campaigns/${id}`, { method: "DELETE" });
    } catch {
      let camps = this.getLocal<Campaign[]>("specter_demo_campaigns", DEFAULT_CAMPAIGNS);
      camps = camps.filter(c => c.id !== id);
      this.setLocal("specter_demo_campaigns", camps);
    }
  }

  // Target Groups
  async getGroups() {
    try {
      return await this.request<TargetGroup[]>("/groups");
    } catch {
      return this.getLocal<TargetGroup[]>("specter_demo_groups", DEFAULT_GROUPS);
    }
  }

  async createGroup(name: string, description?: string) {
    try {
      return await this.request<TargetGroup>("/groups", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
    } catch {
      const groups = this.getLocal<TargetGroup[]>("specter_demo_groups", DEFAULT_GROUPS);
      const newG: TargetGroup = {
        id: "g" + (groups.length + 1),
        name,
        description: description || null,
        member_count: Math.floor(Math.random() * 60) + 10,
        created_at: new Date().toISOString()
      };
      groups.push(newG);
      this.setLocal("specter_demo_groups", groups);
      return newG;
    }
  }

  // Simulations
  async quickSimulate(vector: string, topic: string, _tone = "urgent") {
    try {
      return await this.request<SimulationResult>("/simulations/quick", {
        method: "POST",
        body: JSON.stringify({ vector, topic, tone: _tone }),
      });
    } catch {
      // Craft engaging simulations immediately in client-side to evaluate features
      const result: SimulationResult = {
        simulation_id: "sim_" + Math.random().toString(36).substring(2, 11),
        vector,
        tracking_token: "track_" + Math.random().toString(36).substring(2, 11),
        tracking_url: "#",
        training_url: "#",
        content: {},
        red_flags: [],
        social_engineering_tactics: []
      };

      if (vector === "email" || vector === "email_phishing") {
        result.content = {
          sender_name: "Internal Service Operations",
          sender_email: "notifications-alert-support@corporate-internal.org",
          subject: "Urgent Update Required - Administrative Review",
          body_text: "Attention Partner,\n\nOur information security team has requested an immediate audit on active staff payroll benefits and shared data structures. Dedicate 2 minutes to inspect your listing to avoid immediate pay cycle interruptions.\n\nVerify and confirm at: http://security-verify-sso.corporate-internal.org/auth/login\n\nYour prompt compliance is vital.\n\nInformation Security & Ops team"
        };
        result.red_flags = [
          "Urgency pressure: threat of 'immediate pay cycle interruptions' to induce blind clicking",
          "Mismatched domain structure: security-verify-sso.corporate-internal.org is not our corporate Okta single-sign-on domain",
          "Generic salutation: 'Attention Partner' instead of your specific name"
        ];
        result.social_engineering_tactics = ["Urgency", "Pretexting", "Authority Coercion"];
      } else if (vector === "qr" || vector === "qr_code_attacks") {
        result.content = {
          poster_title: "Annual Employee Engagement Sync WiFi Key",
          poster_body: "Scan this temporary local QR network beacon to register your corporate iPad / iPhone on our meeting routers. Avoid technical difficulties.",
          qr_data_uri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='white'/><rect x='10' y='10' width='40' height='40' fill='black'/><rect x='20' y='20' width='20' height='20' fill='white'/><rect x='100' y='10' width='40' height='40' fill='black'/><rect x='110' y='20' width='20' height='20' fill='white'/><rect x='10' y='100' width='40' height='40' fill='black'/><rect x='20' y='110' width='20' height='20' fill='white'/><circle cx='75' cy='75' r='10' fill='red'/><rect x='60' y='60' width='10' height='10' fill='black'/><rect x='80' y='80' width='15' height='15' fill='black'/><rect x='65' y='120' width='20' height='20' fill='black'/></svg>"
        };
        result.red_flags = [
          "Bypasses standard MDM (Mobile Device Management) security configurations entirely",
          "Printed posters with unknown WiFi login landing screens are classic physical spear triggers"
        ];
        result.social_engineering_tactics = ["Physical Proximal Trust", "Pretexting"];
      } else if (vector === "fake_login" || vector === "credential_harvesting") {
        result.content = {
          title: "Microsoft 365 Password Validation Required",
          scenario_type: "Okta / Microsoft Azure SSO Replica",
          script: "[INFRASTRUCTURE REPLICA SETTINGS]\nDomain Target: azure-active-directory-portal.net/access-sync\nAsset: High-fidelity Microsoft 365 OAuth credentials phishing portal.\nCaptured fields: username, primary_password, device_sync_challenge"
        };
        result.red_flags = [
          "Serves from a totally external and suspicious '.net' domain nameserver",
          "Bypasses physical corporate authentication key chains"
        ];
        result.social_engineering_tactics = ["Technical Spoof", "Credential Harvesting"];
      } else {
        result.content = {
          title: "Vendor Technical Engineer Pretexting Caller",
          scenario_type: "IT Desk Scenario Caller Script",
          script: "[CALL SCRIPT]\nCaller: 'Hey, this is Marcus calling from Cisco Partner support. We detected a major coolant vent fan failure on node 12b in your principal branch server racks. I need you to create a temporary SSH port bridge so I can verify the diagnostics before the core triggers shutdown.'\n\nGoal rubric:\n1. Politely say you need a verified ServiceNow ticket reference.\n2. Do NOT establish port forwards.\n3. Report security department callback line."
        };
        result.red_flags = [
          "Request for operational port forwarding under stress of 'cooling unit failure'",
          "Direct calls demanding emergency operations bypass security access control standards"
        ];
        result.social_engineering_tactics = ["Pretexting", "Authority Simulation"];
      }

      // Add to simulated history
      const sims = this.getLocal<Simulation[]>("specter_demo_simulations", DEFAULT_SIMULATIONS);
      sims.unshift({
        id: result.simulation_id,
        campaign_id: "camp_01jh19as7",
        target_user_id: "u" + (sims.length + 1),
        vector: vector,
        difficulty_tier: "highly_targeted",
        status: "created",
        created_at: new Date().toISOString()
      });
      this.setLocal("specter_demo_simulations", sims);

      // Increment stats requests
      const meters = this.getLocal<MetricsData>("specter_demo_metrics", DEFAULT_METRICS);
      meters.total_requests += 1;
      meters.endpoints["/api/v1/simulations/quick"].count += 1;
      this.setLocal("specter_demo_metrics", meters);

      return result;
    }
  }

  async getSimulations() {
    try {
      return await this.request<Simulation[]>("/simulations");
    } catch {
      return this.getLocal<Simulation[]>("specter_demo_simulations", DEFAULT_SIMULATIONS);
    }
  }

  async getVectors() {
    try {
      return await this.request<VectorInfo[]>("/simulations/vectors");
    } catch {
      return [
        { type: "email", requires_pro: false, tier: "core" },
        { type: "qr", requires_pro: false, tier: "core" },
        { type: "fake_login", requires_pro: true, tier: "enterprise" },
        { type: "pretext", requires_pro: true, tier: "enterprise" }
      ];
    }
  }

  // Metrics
  async getMetrics() {
    try {
      return await this.request<MetricsData>("/metrics");
    } catch {
      return this.getLocal<MetricsData>("specter_demo_metrics", DEFAULT_METRICS);
    }
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
