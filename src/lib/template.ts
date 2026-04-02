import { createClient } from "@/lib/supabase/client";

export async function getTemplatesForOrg(organizationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return data;
}

export async function uploadTemplate(orgId: string, file: File) {
  const supabase = createClient();
  const { data: storageData, error: storageError } = await supabase.storage
    .from("templates")
    .upload(`${orgId}/${file.name}`, file, {
      cacheControl: "3600",
      upsert: true,
    });
  if (storageError) throw storageError;

  // Update or insert into the templates table
  // First check if it exists (so we don't have duplicate entries for same file)
  const { data: existing } = await supabase
    .from("templates")
    .select("id")
    .eq("organization_id", orgId)
    .eq("file_name", file.name)
    .maybeSingle();

  if (!existing) {
    const { error: dbError } = await supabase
      .from("templates")
      .insert([{ organization_id: orgId, file_name: file.name }]);
    if (dbError) throw dbError;
  }

  return storageData;
}

export async function getTemplateUrl(orgId: string, fileName: string) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from("templates")
    .getPublicUrl(`${orgId}/${fileName}`);
  return data.publicUrl;
}
