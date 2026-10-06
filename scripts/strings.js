// Lists every user-visible English string so translations can be checked for gaps.
// usage: node scripts/strings.js [out.json]   (also: --missing to print only keys with no translation)
const fs = require('fs'), path = require('path');
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(e.name) && !p.includes('locales') && files.push(p); });
walk('src');
const found = new Map();
const ok = (s) => /[A-Za-z]{2}/.test(s) && !/=>|;|const|use[A-Z]|<\/|\$\{/.test(s) && !/^(true|false|null|undefined)$/.test(s) && !/^[a-z]+(_[a-z]+)+$/.test(s) && !/^#|^\.|^@|^(row|column|center|flex-end|flex-start|space-|absolute|contain|cover|transparent|none|auto|number|string|boolean|button|checkbox|tab|default|primary|danger|ghost)$/.test(s);
const add = (s, f) => { s = s.trim().replace(/\s+/g, ' '); if (s.length > 1 && ok(s)) found.set(s, (found.get(s) ?? new Set()).add(path.basename(f))); };
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/>\s*([A-Za-z0-9‹›▲▼·+–−•][^<>{}\n]*?)\s*<\//g)) add(m[1], f);                    // JSX text
  for (const m of src.matchAll(/\b(?:label|title|placeholder|hint|text|accessibilityLabel)=["']([^"']+)["']/g)) add(m[1], f); // props
  for (const m of src.matchAll(/\b(?:label|title|hint|placeholder|text|name):\s*'([^']+)'/g)) add(m[1], f);       // object props
  for (const m of src.matchAll(/\btr\(\s*'((?:[^'\\]|\\.)*)'/g)) found.set(m[1].replace(/\\'/g, "'"), (found.get(m[1]) ?? new Set()).add(path.basename(f))); // explicit tr('..')
  for (const m of src.matchAll(/\btr\(\s*"((?:[^"\\]|\\.)*)"/g)) found.set(m[1], (found.get(m[1]) ?? new Set()).add(path.basename(f)));
  for (const m of src.matchAll(/\b(?:v|label):\s*'([^']+)',\s*label:\s*'([^']+)'/g)) add(m[2], f);
}
const keys = [...found.keys()].sort();
if (process.argv.includes('--missing')) {
  const t = fs.readFileSync('src/locales/strings.ts', 'utf8') + fs.readFileSync('src/locales/strings2.ts', 'utf8');
  const have = new Set([...t.matchAll(/^\s*\[\s*'((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1].replace(/\\'/g, "'")));
  const missing = keys.filter((k) => !have.has(k));
  console.log(missing.join('\n')); console.error(`${missing.length} missing of ${keys.length}`);
} else {
  fs.writeFileSync(process.argv[2] || 'strings.json', JSON.stringify(keys, null, 1)); console.log(keys.length);
}
