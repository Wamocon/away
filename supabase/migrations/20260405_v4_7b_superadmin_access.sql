-- ============================================================
-- Away v4.7b – Super-Admin Tabellenberechtigungen
-- ============================================================
-- Problem: public.super_admins hat keine SELECT-Berechtigung
-- für eingeloggte Nutzer → isSuperAdmin() gibt immer false zurück.
-- ============================================================

-- ── 1. RLS aktivieren + Self-Check Policy ───────────────────
-- Jeder eingeloggte User darf nur seine eigene Zeile lesen.
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_self_select" ON public.super_admins;
CREATE POLICY "super_admins_self_select"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Super-Admins dürfen die ganze Tabelle verwalten
DROP POLICY IF EXISTS "super_admins_all" ON public.super_admins;
CREATE POLICY "super_admins_all"
  ON public.super_admins
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = auth.uid()));

-- ── 2. GRANT für authenticated Role ────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.super_admins TO authenticated;
GRANT SELECT ON public.super_admins TO anon;
