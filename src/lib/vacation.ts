import { createClient } from '@/lib/supabase/client';

export interface VacationRequestInput {
  userId: string;
  organizationId: string;
  from: string;
  to: string;
  reason: string;
}

export async function createVacationRequest({ userId, organizationId, from, to, reason }: VacationRequestInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacation_requests')
    .insert([{ user_id: userId, organization_id: organizationId, from, to, reason }]);
  if (error) throw error;
  return data;
}

export async function getVacationRequestsForOrg(organizationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('*')
    .eq('organization_id', organizationId);
  if (error) throw error;
  return data;
}
