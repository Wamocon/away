import { createClient } from '@/lib/supabase/client';

export type VacationStatus = 'pending' | 'approved' | 'rejected';

export interface VacationRequest {
  id: string;
  user_id: string;
  organization_id: string;
  from: string;
  to: string;
  reason: string;
  status: VacationStatus;
  created_at: string;
}

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
    .insert([{ user_id: userId, organization_id: organizationId, from, to, reason, status: 'pending' }]);
  if (error) throw error;
  return data;
}

export async function getVacationRequestsForOrg(organizationId: string): Promise<VacationRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as VacationRequest[]) || [];
}

export async function getMyVacationRequests(userId: string): Promise<VacationRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as VacationRequest[]) || [];
}

export async function updateVacationStatus(requestId: string, status: VacationStatus) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vacation_requests')
    .update({ status })
    .eq('id', requestId)
    .select('*')
    .single();
  if (error) throw error;
  return data as VacationRequest;
}
