import type {
  AdminProject,
  ProjectDocument,
  ProjectPhoto,
  ProjectSummary,
  ProjectUpdate,
  QuoteRequest,
  WorkerReport,
} from "@obragoito/core";

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  category: ProjectSummary["category"];
  location: string | null;
  year: number | null;
  client_name: string | null;
  cover_image: string | null;
  cover_image_alt: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  status?: "active" | "completed" | null;
};

export function mapSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    category: row.category,
    location: row.location,
    year: row.year,
    coverImage: row.cover_image,
    coverImageAlt: row.cover_image_alt,
  };
}

export type AssignmentRow = { user_id: string; full_name: string; email: string; role: "admin" | "client" | "worker" };

export function mapAdminProject(row: ProjectRow & {
  assignments?: AssignmentRow[] | null;
  update_count?: string | number | null;
}): AdminProject {
  return {
    ...mapSummary(row),
    description: row.description,
    clientName: row.client_name,
    isPublished: row.is_published,
    status: row.status ?? "active",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    assignments: (row.assignments ?? []).map((assignment) => ({
      userId: assignment.user_id,
      fullName: assignment.full_name,
      email: assignment.email,
      role: assignment.role,
    })),
    updateCount: Number(row.update_count ?? 0),
  };
}

export type UpdateRow = {
  id: string;
  project_id: string;
  title: string;
  body: string;
  progress: number | null;
  created_at: string;
  author_name: string | null;
};

export function mapUpdate(row: UpdateRow): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    body: row.body,
    progress: row.progress,
    createdAt: row.created_at,
    authorName: row.author_name,
  };
}

export type DocumentRow = {
  id: string;
  project_id: string;
  title: string;
  file_name: string;
  size_bytes: string | number | null;
  created_at: string;
  visible_to_client: boolean;
};

export function mapDocument(row: DocumentRow, url: string | null): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    fileName: row.file_name,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    createdAt: row.created_at,
    url,
    visibleToClient: row.visible_to_client,
  };
}

export type PhotoRow = {
  id: string;
  project_id: string;
  storage_path: string;
  caption: string | null;
  alt: string | null;
  created_at: string;
};

export function mapPhoto(row: PhotoRow, url: string | null): ProjectPhoto {
  return {
    id: row.id,
    projectId: row.project_id,
    url,
    caption: row.caption,
    alt: row.alt,
    createdAt: row.created_at,
  };
}

export type QuoteRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  status: "new" | "contacted" | "closed";
  created_at: string;
};

export function mapQuote(row: QuoteRow): QuoteRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: (row.service as QuoteRequest["service"]) ?? null,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export type ReportRow = {
  id: string;
  project_id: string;
  project_name: string;
  worker_name: string;
  body: string;
  progress: number | null;
  status: "submitted" | "reviewed";
  created_at: string;
};

export function mapReport(row: ReportRow): WorkerReport {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    workerName: row.worker_name,
    body: row.body,
    progress: row.progress,
    status: row.status,
    createdAt: row.created_at,
  };
}
