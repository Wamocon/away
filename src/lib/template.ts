import { createClient } from "@/lib/supabase/client";

export interface DocumentTemplate {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx";
  storage_path: string;
  organization_id: string;
  created_at?: string;
}

export async function getTemplatesForOrg(organizationId: string): Promise<DocumentTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("id, name, type, storage_path, organization_id, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentTemplate[];
}

export async function uploadTemplate(orgId: string, file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${orgId}/${Date.now()}_${file.name}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from("templates")
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("document_templates")
    .insert([{
      organization_id: orgId,
      name: file.name.replace(`.${ext}`, ""),
      type: ext,
      storage_path: path,
    }]);
  if (dbError) throw dbError;

  return storageData;
}

export async function getTemplateUrl(orgId: string, fileName: string) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from("templates")
    .getPublicUrl(`${orgId}/${fileName}`);
  return data.publicUrl;
}

/**
 * Laedt die Bytes einer Vorlagendatei aus dem Supabase Storage Bucket "templates".
 * @param storagePath - vollstaendiger Pfad aus document_templates.storage_path
 */
export async function getTemplateBytes(storagePath: string): Promise<ArrayBuffer> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("templates")
    .download(storagePath);
  if (error) throw error;
  return data.arrayBuffer();
}
