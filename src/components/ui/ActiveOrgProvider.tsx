"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyOrganizations } from "@/lib/actions/adminActions";

const ORG_STORAGE_KEY = "away-active-org-id";

export interface OrgInfo {
  id: string;
  name: string;
}

interface ActiveOrgContextValue {
  orgs: OrgInfo[];
  currentOrg: OrgInfo | null;
  currentOrgId: string | null;
  switchOrg: (orgId: string) => void;
  userId: string | null;
  reload: () => Promise<void>;
  loading: boolean;
}

const ActiveOrgContext = createContext<ActiveOrgContextValue>({
  orgs: [],
  currentOrg: null,
  currentOrgId: null,
  switchOrg: () => {},
  userId: null,
  reload: async () => {},
  loading: true,
});

export function useActiveOrg() {
  return useContext(ActiveOrgContext);
}

export function ActiveOrgProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setLoading(false);
      return;
    }
    setUserId(data.user.id);

    try {
      const list = await getMyOrganizations();
      const filtered = (list || []).filter(
        (o): o is OrgInfo => o !== null && typeof o.id === "string",
      );
      setOrgs(filtered);

      // Gespeicherte Org aus localStorage bevorzugen
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(ORG_STORAGE_KEY);
      } catch {
        /* SSR / no localStorage */
      }
      const validSaved = saved && filtered.some((o) => o.id === saved);
      const active = validSaved ? saved : (filtered[0]?.id ?? null);

      setCurrentOrgId(active);
      if (active) {
        try {
          localStorage.setItem(ORG_STORAGE_KEY, active);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error("[ActiveOrgProvider] Fehler beim Laden:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const switchOrg = useCallback(
    (orgId: string) => {
      setCurrentOrgId(orgId);
      try {
        localStorage.setItem(ORG_STORAGE_KEY, orgId);
      } catch {
        /* ignore */
      }
      // Benutzerdefiniertes Event für Komponenten, die nicht im Context sind
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("away-org-change", { detail: { orgId } }),
        );
      }
    },
    [],
  );

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  return (
    <ActiveOrgContext.Provider
      value={{ orgs, currentOrg, currentOrgId, switchOrg, userId, reload: load, loading }}
    >
      {children}
    </ActiveOrgContext.Provider>
  );
}
