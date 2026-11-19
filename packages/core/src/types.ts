import type { ServiceCategory } from "./company";

export type Role = "admin" | "client" | "worker";
export type AccountStatus = "active" | "disabled";
export type Portal = Role | "dev";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  isDeveloper?: boolean;
};

export type ProjectStatus = "active" | "completed";

export type SiteState = {
  maintenance: { enabled: boolean; message: string | null };
  company?: { name: string; email: string; phone: string; address: string };
};

export type DailyEntry = {
  id: string;
  reportDate: string;
  projectId: string;
  projectName: string;
  workerName: string;
  transcript: string;
  status: "open" | "closed";
  createdAt: string;
};

export type DailySummary = {
  id: string;
  reportDate: string;
  projectId: string;
  projectName: string;
  summary: string;
  recipients: string[];
  emailsSent: number;
  createdAt: string;
};

export type DevOverview = {
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  databaseLatencyMs: number;
  memoryMb: number;
  counts: { users: number; clients: number; workers: number; projects: number; errors24h: number };
  config: {
    authProvider: string;
    storageDriver: string;
    emailConfigured: boolean;
    transcriptionAvailable: boolean;
    geminiConfigured: boolean;
    supabaseConfigured: boolean;
  };
  maintenance: { enabled: boolean; message: string | null; since: string | null };
  errors: {
    id: string;
    level: "warning" | "error" | "fatal";
    source: string;
    message: string;
    path: string | null;
    method: string | null;
    status: number | null;
    createdAt: string;
  }[];
};

export type ProjectSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  category: ServiceCategory;
  location: string | null;
  year: number | null;
  coverImage: string | null;
  coverImageAlt: string | null;
};

export type PublicProject = ProjectSummary & {
  description: string | null;
  clientName: string | null;
  gallery: { id: string; url: string; caption: string | null; alt: string | null }[];
};

export type ProjectUpdate = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  progress: number | null;
  createdAt: string;
  authorName: string | null;
};

export type ProjectDocument = {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  sizeBytes: number | null;
  createdAt: string;
  url: string | null;
  visibleToClient: boolean;
};

export type ProjectPhoto = {
  id: string;
  projectId: string;
  url: string | null;
  caption: string | null;
  alt: string | null;
  createdAt: string;
};

export type AdminProject = ProjectSummary & {
  description: string | null;
  clientName: string | null;
  isPublished: boolean;
  status: ProjectStatus;
  sortOrder: number;
  createdAt: string;
  assignments: { userId: string; fullName: string; email: string; role: Role }[];
  updateCount: number;
};

export type ClientProject = ProjectSummary & {
  description: string | null;
  progress: number | null;
  updates: ProjectUpdate[];
  photos: ProjectPhoto[];
  documents: ProjectDocument[];
};

export type WorkerProject = ProjectSummary & {
  roleOnProject: string | null;
  lastUpdateAt: string | null;
  reportCount: number;
};

export type Thread = {
  id: string;
  subject: string;
  projectId: string | null;
  projectName: string | null;
  participantNames: string[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

export type WorkerReport = {
  id: string;
  projectId: string;
  projectName: string;
  workerName: string;
  body: string;
  progress: number | null;
  status: "submitted" | "reviewed";
  createdAt: string;
};

export type QuoteRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: ServiceCategory | "outro" | null;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  actorName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
};

export type AdminDashboard = {
  counts: {
    projects: number;
    publishedProjects: number;
    clients: number;
    workers: number;
    openThreads: number;
    newQuotes: number;
    pendingReports: number;
  };
  recentQuotes: QuoteRequest[];
  recentReports: WorkerReport[];
  recentAudit: AuditEntry[];
};

export type AppSettings = {
  voiceEnabled: boolean;
  voiceAvailable: boolean;
  transcriptionProvider: string | null;
};

export type ApiErrorBody = { error: string; message: string; details?: unknown };
