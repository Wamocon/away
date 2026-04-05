-- ============================================================
-- AWAY – CREATE TEST USERS SCRIPT
-- ============================================================
-- This script creates three test users (Admin, Genehmiger, Mitarbeiter)
-- and assigns them to a default organization across all schemas.
--
-- Passwords:
-- Admin:        !WMCAdmin26
-- Genehmiger:   !WMCGehn26
-- Mitarbeiter:  !WMCMita26
-- ============================================================

DO $$
DECLARE
  -- User IDs (Fixed UUIDs for consistency)
  admin_id UUID := 'a1111111-1111-1111-1111-111111111111';
  gehn_id  UUID := 'b2222222-2222-2222-2222-222222222222';
  mita_id  UUID := 'c3333333-3333-3333-3333-333333333333';
  
  -- Org ID
  org_id   UUID := 'f0000000-0000-0000-0000-000000000000';
  org_name TEXT := 'Wamocon Test-Organisation';

  -- Schemas to update
  schema_names TEXT[] := ARRAY['away-dev', 'away-prod', 'away-test'];
  s TEXT;
  
  -- Passwords (Hashed with bcrypt - salt 'bf' is standard for Supabase)
  admin_pwd_hash TEXT := crypt('!WMCAdmin26', gen_salt('bf'));
  gehn_pwd_hash  TEXT := crypt('!WMCGehn26', gen_salt('bf'));
  mita_pwd_hash  TEXT := crypt('!WMCMita26', gen_salt('bf'));

BEGIN
  -- 1. Create Users in auth.users if they don't exist
  -- Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = admin_id) THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'admin@away.de', admin_pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"firstName":"WMC","lastName":"Admin"}', now(), now(), 'authenticated', '', '', '', '');
    
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, admin_id, format('{"sub":"%s","email":"%s"}', admin_id, 'admin@away.de')::jsonb, 'email', now(), now(), now());
  END IF;

  -- Genehmiger
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = gehn_id) THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (gehn_id, '00000000-0000-0000-0000-000000000000', 'genehmiger@away.de', gehn_pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"firstName":"WMC","lastName":"Gehn"}', now(), now(), 'authenticated', '', '', '', '');
    
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), gehn_id, gehn_id, format('{"sub":"%s","email":"%s"}', gehn_id, 'genehmiger@away.de')::jsonb, 'email', now(), now(), now());
  END IF;

  -- Mitarbeiter
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = mita_id) THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (mita_id, '00000000-0000-0000-0000-000000000000', 'mitarbeiter@away.de', mita_pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"firstName":"WMC","lastName":"Mita"}', now(), now(), 'authenticated', '', '', '', '');
    
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), mita_id, mita_id, format('{"sub":"%s","email":"%s"}', mita_id, 'mitarbeiter@away.de')::jsonb, 'email', now(), now(), now());
  END IF;

  -- 2. Link to Organizations and Roles in all relevant schemas
  FOREACH s IN ARRAY schema_names
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
      
      -- 1. Drop existing constraint
      EXECUTE format('ALTER TABLE %I.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check', s);
      
      -- 2. Migrate existing data (e.g., 'user' -> 'employee')
      EXECUTE format('UPDATE %I.user_roles SET role = ''employee'' WHERE role = ''user''', s);
      
      -- 3. Apply new constraint for all roles
      EXECUTE format('
        ALTER TABLE %I.user_roles ADD CONSTRAINT user_roles_role_check 
          CHECK (role IN (''admin'', ''cio'', ''approver'', ''employee''));
      ', s);

      -- Ensure Organization exists
      EXECUTE format('INSERT INTO %I.organizations (id, name) VALUES (%L, %L) ON CONFLICT (id) DO NOTHING', s, org_id, org_name);
      
      -- Assign Admin
      EXECUTE format('INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, admin_id, org_id, 'admin');
      EXECUTE format('INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, admin_id, org_id, '{"firstName":"WMC","lastName":"Admin","email":"admin@away.de"}');

      -- Assign Genehmiger (approver)
      EXECUTE format('INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, gehn_id, org_id, 'approver');
      EXECUTE format('INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, gehn_id, org_id, '{"firstName":"WMC","lastName":"Gehn","email":"genehmiger@away.de"}');

      -- Assign Mitarbeiter (employee)
      EXECUTE format('INSERT INTO %I.user_roles (user_id, organization_id, role) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, mita_id, org_id, 'employee');
      EXECUTE format('INSERT INTO %I.user_settings (user_id, organization_id, settings) VALUES (%L, %L, %L) ON CONFLICT DO NOTHING', s, mita_id, org_id, '{"firstName":"WMC","lastName":"Mita","email":"mitarbeiter@away.de"}');

      RAISE NOTICE 'Schema %: Test-Nutzer wurden erfolgreich verknüpft.', s;
    END IF;
  END LOOP;
END;
$$;
