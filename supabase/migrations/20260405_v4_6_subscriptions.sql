-- ============================================================
-- Away v4.6 – Business Model: Subscription Plans & Trial System
-- ============================================================
-- Neue Tabellen (in allen drei Schemas):
--   subscription_plans  – Produktpläne: lite, pro
--   subscriptions       – Abo pro Organisation mit Status + Zeitstempeln
--   super_admins        – SaaS-Plattform-Admins (schema-unabhängig in public)
-- ============================================================

-- ── 1. super_admins (public, schema-unabhängig) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Initiale Super-Admin-Anlage: manuell per INSERT nach Deployment
-- Beispiel: INSERT INTO public.super_admins (user_id) VALUES ('<uuid-hier>');

-- ── 2. subscription_plans + subscriptions pro Schema ─────────────────────────
DO $migration$
DECLARE
  schemas TEXT[] := ARRAY['away-dev', 'away-test', 'away-prod'];
  s       TEXT;
  lite_id UUID;
  pro_id  UUID;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = s
    ) THEN
      RAISE NOTICE 'Schema % nicht gefunden – übersprungen.', s;
      CONTINUE;
    END IF;

    -- ── 2a. subscription_plans ──────────────────────────────────────────────
    EXECUTE format(
      $tbl$
      CREATE TABLE IF NOT EXISTS %I.subscription_plans (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          TEXT NOT NULL UNIQUE CHECK (name IN ('lite', 'pro')),
        max_users     INT,          -- NULL = unbegrenzt (Pro)
        features      JSONB NOT NULL DEFAULT '{}'::jsonb,
        price_monthly NUMERIC(10,2) DEFAULT 0,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
      $tbl$,
      s
    );

    -- ── 2b. Seed: lite & pro Plan ────────────────────────────────────────────
    EXECUTE format(
      $seed$
      INSERT INTO %I.subscription_plans (id, name, max_users, features, price_monthly)
      VALUES
        (
          gen_random_uuid(),
          'lite',
          50,
          '{
            "vacation_requests": true,
            "approval_workflow": true,
            "in_app_calendar": true,
            "user_settings": true,
            "invite_link": true,
            "legal_consent": true,
            "calendar_sync": false,
            "email_integration": false,
            "document_templates": false,
            "reports": false,
            "multi_org": false,
            "admin_consents": false,
            "calendar_invite": false
          }',
          0
        ),
        (
          gen_random_uuid(),
          'pro',
          NULL,
          '{
            "vacation_requests": true,
            "approval_workflow": true,
            "in_app_calendar": true,
            "user_settings": true,
            "invite_link": true,
            "legal_consent": true,
            "calendar_sync": true,
            "email_integration": true,
            "document_templates": true,
            "reports": true,
            "multi_org": true,
            "admin_consents": true,
            "calendar_invite": true
          }',
          0
        )
      ON CONFLICT (name) DO NOTHING
      $seed$,
      s
    );

    -- ── 2c. subscriptions ────────────────────────────────────────────────────
    EXECUTE format(
      $tbl$
      CREATE TABLE IF NOT EXISTS %I.subscriptions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES %I.organizations(id) ON DELETE CASCADE,
        plan_id         UUID NOT NULL REFERENCES %I.subscription_plans(id),
        status          TEXT NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial', 'active', 'expired', 'grace', 'pending_order')),
        trial_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
        trial_end       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
        grace_end       TIMESTAMPTZ,
        activated_by    UUID REFERENCES auth.users(id),
        order_requested_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT now(),
        UNIQUE (organization_id)
      )
      $tbl$,
      s, s, s
    );

    -- ── 2d. RLS für subscriptions ─────────────────────────────────────────────
    EXECUTE format('ALTER TABLE %I.subscriptions ENABLE ROW LEVEL SECURITY', s);

    -- Org-Admins/CIOs dürfen ihre eigene Subscription lesen
    EXECUTE format(
      $pol$
      DROP POLICY IF EXISTS "subscriptions_org_admin_select" ON %I.subscriptions;
      CREATE POLICY "subscriptions_org_admin_select"
        ON %I.subscriptions FOR SELECT
        USING (
          public.is_admin_in_org(%L, organization_id)
          OR EXISTS (
            SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
          )
        )
      $pol$,
      s, s, s
    );

    -- Nur Super-Admins dürfen insert/update/delete
    EXECUTE format(
      $pol$
      DROP POLICY IF EXISTS "subscriptions_super_admin_write" ON %I.subscriptions;
      CREATE POLICY "subscriptions_super_admin_write"
        ON %I.subscriptions FOR ALL
        USING (
          EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
        )
      $pol$,
      s, s
    );

    -- Alle eingeloggten User dürfen ihre Org-Subscription lesen (für PlanGate)
    EXECUTE format(
      $pol$
      DROP POLICY IF EXISTS "subscriptions_member_select" ON %I.subscriptions;
      CREATE POLICY "subscriptions_member_select"
        ON %I.subscriptions FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM %I.user_roles ur
            WHERE ur.organization_id = organization_id
              AND ur.user_id = auth.uid()
          )
        )
      $pol$,
      s, s, s
    );

    RAISE NOTICE 'Schema %: subscription_plans + subscriptions angelegt.', s;
  END LOOP;
END;
$migration$;

-- ── 3. PostgREST Schema-Cache neu laden ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';
