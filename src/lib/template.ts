import { createClient } from '@/lib/supabase/client';

export async function getTemplatesForOrg(organizationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('organization_id', organizationId);
  if (error) throw error;
  return data;
}

export async function uploadTemplate(orgId: string, file: File) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('templates')
    .upload(`${orgId}/${file.name}`, file, {
      cacheControl: '3600',
      upsert: true,
    });
  if (error) throw error;
  return data;
}

export async function getTemplateUrl(orgId: string, fileName: string) {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('templates')
    .getPublicUrl(`${orgId}/${fileName}`);
  return data.publicUrl;
}
