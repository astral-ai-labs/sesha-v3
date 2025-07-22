// "use server";

/* ==========================================================================*/
// export.ts — Server actions for exporting articles
/* ==========================================================================*/
// Purpose: Handle document generation and export for articles (DocX, PDF, Email)
// Sections: Types, Actions

/* ==========================================================================*/
// Types
/* ==========================================================================*/

export type ExportType = "docx" | "pdf" | "email";

/* ==========================================================================*/
// Actions
/* ==========================================================================*/

export async function handleExportAction({ headline, richContent, slug, version, createdByName, type }: { headline: string; richContent: string; slug: string; version: string; createdByName: string; type: "docx" | "pdf" }) {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headline, richContent, slug, version, createdByName, type }),
  });

  if (!res.ok) {
    return { success: false, error: `Export failed: ${res.statusText}` };
  }

  const blob = await res.blob();
  const filename = `${headline.replace(/\s+/g, "_").toLowerCase()}.${type}`;

  return { success: true, data: blob, filename };
}
