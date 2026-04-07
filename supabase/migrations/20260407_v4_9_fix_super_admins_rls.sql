-- ============================================================
-- Away v4.9 – Fix: Rekursive RLS-Policy auf super_admins
-- ============================================================
-- Problem (v4.7b):
--   Die Policy "super_admins_all" auf public.super_admins nutzt
--   "EXISTS (SELECT 1 FROM public.super_admins ...)" in ihrer USING-Klausel.
--   Das ist eine direkte Rekursion: PostgreSQL wirft
--   "ERROR: infinite recursion detected in policy for relation super_admins",
--   sobald ein Super-Admin Subscriptions von Orgs abfragt, deren Admin er
--   NICHT ist – weil dort der OR-Zweig in subscriptions_org_admin_select
--   das EXISTS auf super_admins triggert.
--
-- Fix:
--   1. Rekursive Policy entfernen.
--   2. Nicht-rekursiven Ersatz mit public.is_super_admin() anlegen
--      (SECURITY DEFINER → postgres-Rechte → BYPASSRLS → keine Rekursion).
--
-- Voraussetzung: v4.7 (public.is_super_admin() Funktion) muss gelaufen sein.
-- ============================================================

-- ── 1. Rekursive Policy entfernen ────────────────────────────────────────────
DROP POLICY IF EXISTS "super_admins_all" ON public.super_admins;

-- ── 2. Nicht-rekursiver Ersatz ────────────────────────────────────────────────
--    Super-Admins dürfen die Tabelle vollständig verwalten.
--    public.is_super_admin() ist SECURITY DEFINER + BYPASSRLS → keine Rekursion.
CREATE POLICY "super_admins_all"
  ON public.super_admins
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ── 3. PostgREST Schema-Cache neu laden ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';
