const fs = require('fs');
const path = 'd:/IDEA/Projekt/away/src/app/admin/settings/page.tsx';

// Read as raw buffer
const buf = fs.readFileSync(path);
const text = buf.toString('latin1'); // treat existing bytes as latin1

// Now the file is actually double-encoded latin1->utf8 
// Decode as latin1, then encode as utf8 would normally give us garbage
// The real issue: the file was saved with utf8 encoding for the ÄÖÜ chars,
// but those bytes were interpreted as windows-1252/latin1 and re-encoded
// So: read as buffer, convert using latin1 interpretation -> back to utf8

// Actually let's see what bytes the Ã„ is:
const idx = text.indexOf('nderungen speichern');
if (idx > 0) {
  const slice = buf.slice(Math.max(0, idx-5), idx+22);
  console.log('Bytes around problem:', [...slice].map(b => b.toString(16).padStart(2,'0')).join(' '));
  console.log('As string:', slice.toString('utf8'));
}
