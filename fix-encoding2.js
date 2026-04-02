const fs = require("fs");
const path = "d:/IDEA/Projekt/away/src/app/admin/settings/page.tsx";

// Read as UTF-8 text (which is what the file actually contains)
const text = fs.readFileSync(path, "utf8");

// The problem: characters like Ä were double-encoded:
// Ä = U+00C4 → UTF-8 bytes: C3 84
// Those bytes were read as Latin-1 giving "Ã" (U+00C3) + chr(0x84)
// But chr(0x84) in Windows-1252 is „ (U+201E)
// Then when saved as UTF-8 the file has: C3 83 E2 80 9E (Ã + „)
// Similarly for all German umlauts

// Reverse mapping: what string appears in file → what it should be
// These are the "Ã" + curly-quote/control versions of German umlauts
const fixes = [
  // Triple-encoded variants (the curly quote issue)
  ["\u00C3\u201E", "\u00C4"], // Ã„ → Ä (U+00C3 + U+201E)
  ["\u00C3\u00A4", "\u00E4"], // Ãä → ä (U+00C3 + U+00A4)
  ["\u00C3\u00B6", "\u00F6"], // Ãö → ö
  ["\u00C3\u00BC", "\u00FC"], // ÃÂ¼ → ü
  ["\u00C3\u0178", "\u00DF"], // ÃÅ¸ → ß (U+0178)
  ["\u00C3\u2014", "\u00DC"], // Ãü → Ü (U+2014 em-dash covers 0x9C → Windows-1252 = œ but...)
  // Common patterns visible in the file
  ["\u00C3\u2013", "\u00D6"], // Ã– → Ö
];

// Let's do a simpler approach: re-encode
// The text was: original bytes (C3 84 = Ä) → read as windows-1252 → got (C3=Ã, 84=„ in W1252)
// To reverse: we need to go through the string, find "Ã" followed by a char,
// take the low byte of both unicode codepoints, and reinterpret as UTF-8

function fixMojibake(str) {
  // Convert string to array of codepoints
  let result = "";
  let i = 0;
  while (i < str.length) {
    const cp = str.codePointAt(i);
    // Check if this is U+00C3 (Ã) followed by another character
    if (cp === 0x00c3 && i + 1 < str.length) {
      const next = str.codePointAt(i + 1);
      // The next char's low byte combined with 0xC3 forms a valid UTF-8 2-byte sequence
      // But next might be Windows-1252 encoded, so we need W1252 → unicode mapping for the byte

      // Windows-1252 byte 0x80-0x9F special chars:
      const w1252map = {
        0x80: 0x20ac, // €
        0x82: 0x201a, // ‚
        0x83: 0x0192, // ƒ
        0x84: 0x201e, // „ ← this is what we see for Ä (byte 0x84)
        0x85: 0x2026, // …
        0x86: 0x2020, // †
        0x87: 0x2021, // ‡
        0x88: 0x02c6, // ˆ
        0x89: 0x2030, // ‰
        0x8a: 0x0160, // Š
        0x8b: 0x2039, // ‹
        0x8c: 0x0152, // Œ
        0x8e: 0x017d, // Ž
        0x91: 0x2018, // '
        0x92: 0x2019, // '
        0x93: 0x201c, // "
        0x94: 0x201d, // "
        0x95: 0x2022, // •
        0x96: 0x2013, // – ← en-dash (appears for Ö = 0xC3 0x96)
        0x97: 0x2014, // — ← em-dash (appears for × = 0xC3 0x97 but also Ü? need check)
        0x98: 0x02dc, // ˜
        0x99: 0x2122, // ™
        0x9a: 0x0161, // š
        0x9b: 0x203a, // ›
        0x9c: 0x0153, // œ
        0x9e: 0x017e, // ž
        0x9f: 0x0178, // Ÿ ← this maps byte 0x9F → Ÿ (appears for ß = 0xC3 0x9F? No, ß=0xDF)
      };

      // Reverse map: for a given unicode codepoint that came from W1252, get original byte
      const reverseW1252 = {};
      for (const [byte, unicode] of Object.entries(w1252map)) {
        reverseW1252[unicode] = parseInt(byte);
      }
      // For 0xA0-0xFF, W1252 maps directly to same unicode codepoints

      let originalByte;
      if (next >= 0xa0 && next <= 0xff) {
        originalByte = next; // direct mapping
      } else if (reverseW1252[next] !== undefined) {
        originalByte = reverseW1252[next];
      } else {
        // Not a W1252 mojibake, keep as-is
        result += str[i];
        i++;
        continue;
      }

      // Now we have bytes 0xC3 and originalByte, forming a 2-byte UTF-8 sequence
      const buf = Buffer.from([0xc3, originalByte]);
      try {
        const fixed = buf.toString("utf8");
        if (fixed.length === 1 && fixed.codePointAt(0) !== 0xfffd) {
          result += fixed;
          i += (next > 0xffff ? 2 : 1) + 1; // skip both chars
          continue;
        }
      } catch (e) {}
    }

    // Also fix Â sequences (0xC2 + latin supplement)
    if (cp === 0x00c2 && i + 1 < str.length) {
      const next = str.codePointAt(i + 1);
      if (next >= 0xa0 && next <= 0xff) {
        const buf = Buffer.from([0xc2, next]);
        const fixed = buf.toString("utf8");
        if (fixed.length === 1) {
          result += fixed;
          i += 2;
          continue;
        }
      }
    }

    result += str[i];
    i += cp > 0xffff ? 2 : 1;
  }
  return result;
}

let fixed = fixMojibake(text);

// Verify
const badCount = (
  fixed.match(/\u00C3[\u0080-\u00FF\u2010-\u2122\u0100-\u017E]/g) || []
).length;
console.log("Remaining mojibake patterns:", badCount);

// Show sample
const lineIdx = fixed.indexOf("nderungen speichern");
if (lineIdx >= 0) {
  console.log(
    "Sample:",
    fixed.substring(Math.max(0, lineIdx - 5), lineIdx + 25),
  );
}

fs.writeFileSync(path, fixed, "utf8");
console.log("Written.");
