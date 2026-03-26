export function Footer() {
  return (
    <footer className="shrink-0 text-center py-3 text-[10px] text-gray-400 dark:text-white/15 border-t border-black/[0.04] dark:border-white/[0.03]">
      Away &copy; {new Date().getFullYear()}
    </footer>
  );
}
