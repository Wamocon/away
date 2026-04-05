#!/usr/bin/env tsx
/**
 * i18n Coverage Check
 *
 * Prüft ob:
 *   1. Alle deutschen Strings (de) eine englische Entsprechung (en) haben – gleiche Schlüssel.
 *   2. Keine deutschen Rohstrings (z.B. "Genehmigen", "Ausstehend") als Hardcode in TSX-Dateien verbleiben.
 *
 * Verwendung: npx tsx src/scripts/check-i18n-coverage.ts
 * Wird im CI durch .github/workflows/2-validation.yml ausgeführt.
 */

import * as fs from "fs";
import * as path from "path";
import { createRequire } from "node:module";

// ─── 1. Key-Parität prüfen ────────────────────────────────────────────────────

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flattenKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function checkKeyParity(): boolean {
  // createRequire ist die ESM-kompatible Alternative zu require()
  const _require = createRequire(__filename);
  const i18nPath = path.resolve(__dirname, "../lib/i18n");
  const { translations } = _require(i18nPath) as {
    translations: { de: unknown; en: unknown };
  };

  const deKeys = new Set(flattenKeys(translations.de));
  const enKeys = new Set(flattenKeys(translations.en));

  const missingInEn = [...deKeys].filter((k) => !enKeys.has(k));
  const missingInDe = [...enKeys].filter((k) => !deKeys.has(k));

  if (missingInEn.length > 0) {
    console.error(
      `\n❌ i18n: ${missingInEn.length} key(s) in DE but missing in EN:\n`,
    );
    missingInEn.forEach((k) => console.error(`   • ${k}`));
  }
  if (missingInDe.length > 0) {
    console.warn(
      `\n⚠️  i18n: ${missingInDe.length} key(s) in EN but missing in DE:\n`,
    );
    missingInDe.forEach((k) => console.warn(`   • ${k}`));
  }

  const ok = missingInEn.length === 0;
  if (ok) {
    console.log(
      `✅ i18n key parity: ${deKeys.size} DE keys — all present in EN`,
    );
  }
  return ok;
}

// ─── 2. Hardcodierte deutsche Strings in TSX-Dateien erkennen ────────────────
// Liste bekannter kritischer Strings die NICHT als Literal in JSX stehen dürfen.
const FORBIDDEN_LITERALS: string[] = [
  "Ausstehend",
  "Genehmigt",
  "Abgelehnt",
  "Urlaubsantrag stellen",
  "Neuer Antrag",
  "Zurück zum Dashboard",
  "Seite nicht gefunden",
  "Lade...",
  "Schließen",
  "Genehmigen",
  "Ablehnen",
  "Einstellungen",
  "Administration",
  "Listenansicht",
  "Rasteransicht",
];

// Patterns that indicate strings are already translated (t.xxx or t['xxx'])
const TRANSLATION_PATTERN = /\bt\.[a-zA-Z]/;

function checkHardcodedStrings(srcDir: string): boolean {
  let violations = 0;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".next", "coverage"].includes(entry.name)) {
          scanDir(fullPath);
        }
        continue;
      }
      if (!entry.name.match(/\.(tsx|ts)$/) || entry.name.endsWith(".test.ts")) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments, import lines, const declarations in i18n.ts itself
        if (
          line.trim().startsWith("//") ||
          line.trim().startsWith("*") ||
          line.includes("import ") ||
          fullPath.endsWith("i18n.ts")
        )
          continue;

        for (const forbidden of FORBIDDEN_LITERALS) {
          if (
            line.includes(`"${forbidden}"`) ||
            line.includes(`'${forbidden}'`) ||
            (line.includes(`>${forbidden}<`) &&
              !TRANSLATION_PATTERN.test(line))
          ) {
            const rel = path.relative(srcDir, fullPath);
            console.warn(
              `⚠️  Hardcoded string "${forbidden}" found in ${rel}:${i + 1}`,
            );
            violations++;
          }
        }
      }
    }
  }

  scanDir(srcDir);

  if (violations === 0) {
    console.log(
      `✅ No hardcoded German string literals found in ${srcDir} (**/*.tsx)`,
    );
  } else {
    console.warn(
      `\n⚠️  ${violations} hardcoded German string(s) found. Consider using t.xxx instead.`,
    );
  }

  // Hardcoded strings are warnings, not blocking errors (violations count returned for info)
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  AWAY — i18n Coverage Check");
  console.log("═══════════════════════════════════════════════════\n");

  const srcDir = path.resolve(__dirname, "..");

  const parityOk = checkKeyParity();
  console.log();
  checkHardcodedStrings(srcDir);

  console.log("\n═══════════════════════════════════════════════════");

  if (!parityOk) {
    console.error("❌ i18n check FAILED — DE/EN key parity mismatch");
    process.exit(1);
  }

  console.log("✅ i18n check passed");
  process.exit(0);
}

main();
