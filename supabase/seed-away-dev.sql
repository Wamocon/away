-- Seed Script für Schema "away-dev"
-- WICHTIG: Ersetze '00000000-0000-0000-0000-000000000000' mit deiner eigenen User-UUID aus Supabase (Auth -> Users)!

DO $$
DECLARE
  my_user_id UUID := 'd3529c12-6065-46af-9967-7c66a0e7385e';
  org_id UUID;
  other_user_id UUID;
BEGIN

  -- Tabellen leeren
  DELETE FROM "away-dev".vacation_requests;
  DELETE FROM "away-dev".user_roles;
  DELETE FROM "away-dev".organizations;

  -- Organisation 1
  org_id := '93060813-1d62-4493-9192-716a2d9b60b8';
  INSERT INTO "away-dev".organizations (id, name) VALUES (org_id, 'Dev Org 1');
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-10-13', '2026-10-15', 'Brückentag', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-05-09', '2026-05-22', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-06', '2026-03-07', 'Familienfeier', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-01-03', '2026-01-09', 'Umzug', 'approved');
  other_user_id := '58e8e8f8-e925-482c-8b11-adbe91fe940a';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-04', '2026-07-07', 'Sommerurlaub', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-16', '2026-06-22', 'Familienfeier', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-01', '2026-04-06', 'Krankheit (Kind)', 'approved');
  other_user_id := 'cd8f523e-cdd1-4e87-9e59-feb8431bcce6';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-05', '2026-01-12', 'Sommerurlaub', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-16', '2026-03-29', 'Brückentag', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-16', '2026-09-26', 'Krankheit (Kind)', 'approved');
  other_user_id := '92b248ce-af08-4fd4-8312-df0b3cf80183';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-17', '2026-08-28', 'Erholung', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-02', '2026-01-03', 'Sommerurlaub', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-11', '2026-10-14', 'Brückentag', 'pending');

  -- Organisation 2
  org_id := '9bc6b6f2-44aa-49ba-8334-1e591b318f44';
  INSERT INTO "away-dev".organizations (id, name) VALUES (org_id, 'Dev Org 2');
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-04', '2026-09-10', 'Umzug', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-04-14', '2026-04-15', 'Brückentag', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-11-02', '2026-11-09', 'Sommerurlaub', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-12-05', '2026-12-14', 'Brückentag', 'pending');
  other_user_id := '5a4acbe0-24fb-4e95-9069-1398d19ca185';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-11', '2026-07-20', 'Brückentag', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-07', '2026-01-18', 'Erholung', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-10', '2026-06-17', 'Städtetrip', 'rejected');
  other_user_id := 'eefeba4e-7daa-42fc-9941-d6e1e496efdc';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-05', '2026-04-13', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-18', '2026-05-27', 'Sommerurlaub', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-16', '2026-10-27', 'Städtetrip', 'pending');
  other_user_id := '7eb6423c-7564-4e2d-bb94-6dd236ed8463';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-12-08', '2026-12-11', 'Brückentag', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-06', '2026-02-12', 'Sommerurlaub', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-12-15', '2026-12-20', 'Erholung', 'rejected');

  -- Organisation 3
  org_id := 'ba4840f6-cb3c-451d-a076-563b60f23cc8';
  INSERT INTO "away-dev".organizations (id, name) VALUES (org_id, 'Dev Org 3');
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-08', '2026-03-19', 'Brückentag', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-17', '2026-09-27', 'Familienfeier', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-07-16', '2026-07-23', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-07-01', '2026-07-04', 'Städtetrip', 'rejected');
  other_user_id := '342bde1d-d500-4869-8f90-c3a28e79f229';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-08', '2026-08-14', 'Erholung', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-14', '2026-03-26', 'Brückentag', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-01', '2026-07-12', 'Erholung', 'approved');
  other_user_id := '5a611527-bbed-436e-801d-2d0c8df7edf6';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-06', '2026-11-08', 'Familienfeier', 'pending');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-02', '2026-11-08', 'Brückentag', 'rejected');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-17', '2026-03-28', 'Umzug', 'rejected');
  other_user_id := 'aa7ffc07-57e6-4840-9674-c9c643c1c35a';
  INSERT INTO "away-dev".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-dev".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-07', '2026-10-11', 'Familienfeier', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-09', '2026-05-22', 'Erholung', 'approved');
  INSERT INTO "away-dev".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-15', '2026-10-26', 'Städtetrip', 'pending');

END;
$$;
