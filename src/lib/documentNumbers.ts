import { createClient } from '@/lib/supabase/client';

/**
 * Checks if a specific document ID (Belegnummer) is already taken within an organization.
 */
export async function isDocumentIdUsed(organizationId: string, documentId: string): Promise<boolean> {
  if (!documentId.trim()) return false;
  
  const supabase = createClient();
  const { count, error } = await supabase
    .from('document_numbers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('document_id', documentId.trim());

  if (error) {
    console.error('Error checking document ID usage:', error);
    return false;
  }
  
  return (count || 0) > 0;
}

/**
 * Registers a new document ID in the database to prevent future duplicates.
 */
export async function registerDocumentId(organizationId: string, userId: string, documentId: string) {
  if (!documentId.trim()) return;

  const supabase = createClient();
  const { error } = await supabase
    .from('document_numbers')
    .insert([{
      organization_id: organizationId,
      user_id: userId,
      document_id: documentId.trim()
    }]);

  if (error) {
    // If it's a unique constraint violation, it was already registered.
    if (error.code === '23505') {
       throw new Error('Diese Belegnummer wurde bereits vergeben.');
    }
    throw error;
  }
}
