"use client";
import { Plane, Menu, LogOut } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { theme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase nicht konfiguriert
    }
    router.push("/auth/login");
  };

  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
      style={{
        background: theme === "dark" ? "#0a0f1a" : "#ffffff",
        borderColor:
          theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile Burger */}
        <button
          onClick={onMenuToggle}
          className="md:hidden text-gray-400 hover:text-white bg-transparent border-none cursor-pointer p-1"
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
            <Plane size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight dark:text-white text-gray-900">
              <span className="text-blue-500">Away</span> Urlaubsplaner
            </div>
            <div className="text-[9px] tracking-widest uppercase dark:text-white/25 text-gray-400">
              Urlaub im Blick
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/[0.05]
          text-gray-400 hover:text-gray-700 hover:bg-black/[0.05]
          bg-transparent border-none cursor-pointer"
      >
        <LogOut size={13} />
        <span className="hidden sm:inline">Abmelden</span>
      </button>
    </header>
  );
}
