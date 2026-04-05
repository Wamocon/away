"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/subscription";
import { useRouter } from "next/navigation";
import SuperAdminSubscriptionsPanel from "@/components/admin/SuperAdminSubscriptionsPanel";

export default function SuperAdminSubscriptionsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push("/auth/login"); return; }
      const admin = await isSuperAdmin(data.user.id);
      if (!admin) { router.push("/dashboard"); return; }
      setIsAdmin(true);
    };
    init();
  }, [router]);

  if (!isAdmin) return null;

  return (
    <div className="p-6 md:p-8 w-full">
      <SuperAdminSubscriptionsPanel />
    </div>
  );
}
