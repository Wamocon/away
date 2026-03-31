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

/**
 * Finds the next available counter for a given prefix.
 * Prefix format: [1st letter First][1st 2 letters Last][Year]
 * Full format: PREFIX + [00-99]
 */
export async function getNextDocumentCounter(organizationId: string, prefix: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('document_numbers')
    .select('document_id')
    .eq('organization_id', organizationId)
    .like('document_id', `${prefix}%`)
    .order('document_id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest document ID:', error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0; // First one is 00
  }

  const latestId = data[0].document_id;
  // Extract trailing digits
  const match = latestId.match(/(\d+)$/);
  if (match) {
    const lastNum = parseInt(match[1], 10);
    return lastNum + 1;
  }

  return 0;
}
