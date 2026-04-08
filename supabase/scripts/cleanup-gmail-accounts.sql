-- ============================================================
-- AWAY – Gmail-Konten aus Authentication entfernen
-- ============================================================
-- Löscht alle doppelten @gmail.com-Accounts, die durch mehrfache
-- Skript-Ausführungen mit alten E-Mail-Adressen entstanden sind.
-- Betroffen (laut Screenshot):
--   daniel.moretz@gmail.com
--   elias.felsing@gmail.com
--   erwin.moretz@gmail.com
--   leon.moretz@gmail.com
--   nikolaj.schefner@gmail.com
--   olga.moretz@gmail.com
--   waleri.moretz@gmail.com
--   yash.bhesaniya@gmail.com
-- ============================================================

DO $$
DECLARE
  gmail_emails TEXT[] := ARRAY[
    'daniel.moretz@gmail.com',
    'elias.felsing@gmail.com',
    'erwin.moretz@gmail.com',
    'leon.moretz@gmail.com',
    'nikolaj.schefner@gmail.com',
    'olga.moretz@gmail.com',
    'waleri.moretz@gmail.com',
    'yash.bhesaniya@gmail.com'
  ];
  gmail_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM auth.users WHERE email = ANY(gmail_emails))
  INTO gmail_ids;

  IF gmail_ids IS NULL OR array_length(gmail_ids, 1) IS NULL THEN
    RAISE NOTICE 'Keine Gmail-Konten gefunden – nichts zu tun.';
    RETURN;
  END IF;

  RAISE NOTICE 'Gefundene Gmail-Konten: %', array_length(gmail_ids, 1);

  -- away-prod: document_numbers vorher entfernen (NOT NULL + ON DELETE SET NULL)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'away-prod' AND table_name = 'document_numbers') THEN
    DELETE FROM "away-prod".document_numbers WHERE user_id = ANY(gmail_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'away-dev' AND table_name = 'document_numbers') THEN
    DELETE FROM "away-dev".document_numbers WHERE user_id = ANY(gmail_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'away-test' AND table_name = 'document_numbers') THEN
    DELETE FROM "away-test".document_numbers WHERE user_id = ANY(gmail_ids);
  END IF;

  DELETE FROM auth.refresh_tokens  WHERE user_id::text = ANY(SELECT unnest(gmail_ids)::text);
  DELETE FROM auth.sessions        WHERE user_id = ANY(gmail_ids);
  DELETE FROM auth.identities      WHERE user_id = ANY(gmail_ids);
  DELETE FROM public.super_admins  WHERE user_id = ANY(gmail_ids);
  DELETE FROM auth.users           WHERE id      = ANY(gmail_ids);

  RAISE NOTICE 'Gmail-Konten erfolgreich gelöscht: %', array_length(gmail_ids, 1);
END;
$$;

-- Ergebnis prüfen: keine @gmail.com mehr vorhanden
SELECT email FROM auth.users WHERE email LIKE '%@gmail.com' ORDER BY email;
