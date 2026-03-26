-- Seed Script für Schema "away-test"
-- WICHTIG: Ersetze '00000000-0000-0000-0000-000000000000' mit deiner eigenen User-UUID aus Supabase (Auth -> Users)!

DO $$
DECLARE
  my_user_id UUID := 'd3529c12-6065-46af-9967-7c66a0e7385e';
  org_id UUID;
  other_user_id UUID;
BEGIN

  -- Tabellen leeren
  DELETE FROM "away-test".vacation_requests;
  DELETE FROM "away-test".user_roles;
  DELETE FROM "away-test".organizations;

  -- Organisation 1
  org_id := 'ad595fdc-6b53-4c7e-b4de-b7fa07bddb02';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 1');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-31', '2026-04-10', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-10', '2026-03-13', 'Erholung', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-12', '2026-03-26', 'Sommerurlaub', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-04-15', '2026-04-18', 'Städtetrip', 'pending');
  other_user_id := 'f59ca5d3-34b8-40aa-9b89-115d013017a3';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-18', '2026-08-28', 'Städtetrip', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-01', '2026-03-08', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-01', '2026-05-03', 'Krankheit (Kind)', 'approved');
  other_user_id := '330892a8-47e0-4b54-b8e7-16e95c6aaf56';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-14', '2026-03-22', 'Brückentag', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-06', '2026-11-14', 'Umzug', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-04', '2026-05-12', 'Familienfeier', 'approved');
  other_user_id := '91f296d9-3ad0-493c-9d55-5f6012e85bf5';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-01', '2026-05-05', 'Familienfeier', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-13', '2026-01-19', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-03', '2026-09-04', 'Erholung', 'rejected');

  -- Organisation 2
  org_id := '4bcbe4da-e3f2-417e-8f3d-da2345744fa4';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 2');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-05-05', '2026-05-19', 'Brückentag', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-01-13', '2026-01-27', 'Sommerurlaub', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-04', '2026-03-08', 'Brückentag', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-11', '2026-03-18', 'Brückentag', 'approved');
  other_user_id := 'ee2e8820-e60e-4b82-84b1-37ada9b7fde9';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-19', '2026-03-31', 'Sommerurlaub', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-14', '2026-09-27', 'Umzug', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-04', '2026-08-08', 'Städtetrip', 'rejected');
  other_user_id := '22e50fb2-1c12-4f1e-89ef-024fa5577441';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-19', '2026-02-20', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-12', '2026-01-21', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-31', '2026-04-13', 'Brückentag', 'pending');
  other_user_id := '947de6b2-daae-4630-8128-f6654cc22ae6';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-06', '2026-08-10', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-11', '2026-10-25', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-16', '2026-01-22', 'Sommerurlaub', 'pending');

  -- Organisation 3
  org_id := '02f044b7-9697-4ae7-a513-1900a4462191';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 3');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-06-06', '2026-06-12', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-11', '2026-03-23', 'Sommerurlaub', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-02-04', '2026-02-06', 'Umzug', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-01', '2026-03-14', 'Krankheit (Kind)', 'pending');
  other_user_id := 'c487efee-4812-4a64-a6e6-9f28a92fc90f';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-03', '2026-07-09', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-18', '2026-05-01', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-07', '2026-07-16', 'Brückentag', 'approved');
  other_user_id := 'b769aa86-a218-4d7e-9647-d1f9d074c379';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-14', '2026-11-27', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-17', '2026-08-27', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-13', '2026-09-23', 'Sommerurlaub', 'pending');
  other_user_id := '9d714910-3317-4816-bdad-b1badf7d66f4';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-13', '2026-11-15', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-12-08', '2026-12-16', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-09', '2026-03-12', 'Umzug', 'pending');

  -- Organisation 4
  org_id := '4d805382-44f8-450c-b00e-fb526fab9911';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 4');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-17', '2026-10-01', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-11-13', '2026-11-26', 'Familienfeier', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-08-18', '2026-08-28', 'Krankheit (Kind)', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-04-08', '2026-04-14', 'Brückentag', 'approved');
  other_user_id := 'd8833993-dff9-4aea-bbb8-122df9dff77d';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-19', '2026-07-28', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-04', '2026-04-15', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-03', '2026-06-13', 'Krankheit (Kind)', 'rejected');
  other_user_id := '7061eb11-f89d-48a6-87dc-9c3bc35fc98d';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-02', '2026-01-08', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-17', '2026-01-20', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-12', '2026-06-17', 'Brückentag', 'rejected');
  other_user_id := '6a640b45-6397-4593-a599-3a08c2ff82be';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-07', '2026-02-11', 'Brückentag', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-02', '2026-08-05', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-03', '2026-10-08', 'Städtetrip', 'pending');

  -- Organisation 5
  org_id := '3a391aea-3a53-4c3f-88a9-e6b57536482e';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 5');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-10-17', '2026-10-25', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-02', '2026-09-15', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-01-15', '2026-01-24', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-01-15', '2026-01-19', 'Familienfeier', 'pending');
  other_user_id := '9c546d55-3611-4c19-b2c7-07a7397c1617';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-12', '2026-04-25', 'Familienfeier', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-03-19', '2026-03-31', 'Umzug', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-05', '2026-06-09', 'Sommerurlaub', 'pending');
  other_user_id := '87ddc104-4083-426f-92be-d9bd6315e740';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-11', '2026-06-25', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-18', '2026-04-29', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-06', '2026-09-19', 'Sommerurlaub', 'pending');
  other_user_id := '3b7a7ae9-81ae-4fa3-a4aa-ac797864f7de';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-05', '2026-04-06', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-09', '2026-02-10', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-12-19', '2026-12-30', 'Umzug', 'rejected');

  -- Organisation 6
  org_id := 'e765f30b-9a5c-437b-b208-11c5ff542441';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 6');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-10-01', '2026-10-05', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-05', '2026-09-18', 'Brückentag', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-05-10', '2026-05-13', 'Familienfeier', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-10-08', '2026-10-20', 'Erholung', 'approved');
  other_user_id := '1a37b184-d76b-4daf-abf1-d5d88ff04ff3';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-14', '2026-06-15', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-15', '2026-08-23', 'Brückentag', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-15', '2026-07-29', 'Krankheit (Kind)', 'rejected');
  other_user_id := '41ae0a7d-cc03-4e4a-b2ba-d2a202ff2ef7';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2025-12-31', '2026-01-01', 'Sommerurlaub', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-02', '2026-10-06', 'Erholung', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-13', '2026-07-24', 'Städtetrip', 'pending');
  other_user_id := '5e234f6c-8cd0-4c37-ba5e-29fd81d858f2';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-12', '2026-08-24', 'Familienfeier', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-13', '2026-10-19', 'Familienfeier', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-18', '2026-05-24', 'Sommerurlaub', 'approved');

  -- Organisation 7
  org_id := '85de2ee6-fabe-4b5c-a585-58ed61025fb4';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 7');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-11-02', '2026-11-08', 'Erholung', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-05-10', '2026-05-18', 'Familienfeier', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-05-13', '2026-05-20', 'Städtetrip', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-06-30', '2026-07-02', 'Sommerurlaub', 'approved');
  other_user_id := '7b70da05-4630-4aa8-b673-3a98e50ef55a';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-08', '2026-01-14', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-31', '2026-06-02', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-09', '2026-07-16', 'Städtetrip', 'pending');
  other_user_id := '2fba00ee-8c64-4b2d-b802-85ba4048ee57';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-30', '2026-05-03', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-13', '2026-11-21', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-09', '2026-07-12', 'Brückentag', 'approved');
  other_user_id := 'c4dcfe33-78b4-4cd6-8c17-1fd7bc5a89e5';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-04', '2026-06-11', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-17', '2026-08-24', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-13', '2026-02-27', 'Umzug', 'rejected');

  -- Organisation 8
  org_id := 'e80c094e-2e92-4ba8-a010-6b64b15dcf1f';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 8');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-08-05', '2026-08-09', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-10-09', '2026-10-13', 'Umzug', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-06-06', '2026-06-10', 'Brückentag', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-09-06', '2026-09-09', 'Krankheit (Kind)', 'rejected');
  other_user_id := '8b8a70c0-bc50-460b-8eb6-cc3116dcb31c';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-06', '2026-02-19', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-12', '2026-04-26', 'Städtetrip', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-08', '2026-06-11', 'Brückentag', 'pending');
  other_user_id := '1525100e-7cc6-48da-a970-374a57dd77cb';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-06-17', '2026-06-19', 'Umzug', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-30', '2026-12-07', 'Krankheit (Kind)', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-14', '2026-10-21', 'Umzug', 'pending');
  other_user_id := '97ba9cac-0b58-4c25-a656-76f04844a112';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-02', '2026-07-03', 'Städtetrip', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-08', '2026-07-09', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-19', '2026-09-26', 'Städtetrip', 'rejected');

  -- Organisation 9
  org_id := 'd6857d98-7f10-4391-9af9-2bd93e5b74e9';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 9');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-03-17', '2026-03-22', 'Familienfeier', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-07-09', '2026-07-22', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-02-02', '2026-02-14', 'Brückentag', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-08-16', '2026-08-21', 'Erholung', 'approved');
  other_user_id := '97099e87-79e1-4c14-a4d2-b7d0179a6bbd';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-16', '2026-09-20', 'Familienfeier', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-14', '2026-11-26', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-18', '2026-04-30', 'Familienfeier', 'pending');
  other_user_id := '967df5a6-4549-4f14-b9eb-78105a2c16b9';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-09', '2026-09-13', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-08', '2026-09-22', 'Krankheit (Kind)', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-08-01', '2026-08-09', 'Erholung', 'approved');
  other_user_id := '2e887c03-70f5-480d-b570-54546f4d4ccf';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-18', '2026-10-27', 'Erholung', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-13', '2026-09-23', 'Städtetrip', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-08', '2026-10-21', 'Städtetrip', 'pending');

  -- Organisation 10
  org_id := '2612a0e2-a2e7-47fa-9220-8a46c0e4f7d5';
  INSERT INTO "away-test".organizations (id, name) VALUES (org_id, 'Test Org 10');
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (my_user_id, org_id, 'admin');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (my_user_id, org_id, '{"email": "demo@example.com"}') ON CONFLICT DO NOTHING;

  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-08-15', '2026-08-19', 'Krankheit (Kind)', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-08-17', '2026-08-31', 'Krankheit (Kind)', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-06-13', '2026-06-26', 'Erholung', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (my_user_id, org_id, '2026-06-09', '2026-06-23', 'Familienfeier', 'pending');
  other_user_id := 'f59a7d84-9bfb-432d-bff2-f774211c4622';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-01-17', '2026-01-28', 'Brückentag', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-11-16', '2026-11-24', 'Umzug', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-02-11', '2026-02-19', 'Erholung', 'pending');
  other_user_id := 'b841c2f5-60d3-46ac-9c75-5903a76799a9';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-12-06', '2026-12-13', 'Krankheit (Kind)', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-04-14', '2026-04-20', 'Sommerurlaub', 'approved');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-10-13', '2026-10-23', 'Brückentag', 'pending');
  other_user_id := '85424c06-c9ed-4431-b2c3-0a78eb565a69';
  INSERT INTO "away-test".user_roles (user_id, organization_id, role) VALUES (other_user_id, org_id, 'user');
  INSERT INTO "away-test".user_settings (user_id, organization_id, settings) VALUES (other_user_id, org_id, '{"email": "user@example.com"}') ON CONFLICT DO NOTHING;
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-09-17', '2026-09-22', 'Sommerurlaub', 'rejected');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-05-03', '2026-05-11', 'Erholung', 'pending');
  INSERT INTO "away-test".vacation_requests (user_id, organization_id, "from", "to", reason, status) VALUES (other_user_id, org_id, '2026-07-07', '2026-07-14', 'Sommerurlaub', 'approved');

END;
$$;
