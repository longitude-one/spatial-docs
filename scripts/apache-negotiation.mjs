import { readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Expand the small, version-controlled template into .htaccess. Qualities are
// integers in thousandths, so close preferences never become server-side ties.
export async function apacheConfiguration() {
  const template = await readFile(new URL('../config/apache/htaccess.template', import.meta.url), 'utf8');
  const rules = [];
  // RFC 9110 quoted-string: commas inside parameter values are not list
  // separators, and quoted-pair consumes its escaped character atomically.
  const quotedString = String.raw`\x22(?:[^\x22\\\r\n]|\\[\t\x20-\x7e\x80-\xff])*\x22`;
  const fieldItem = `(?:[^\\x22,\\r\\n]|${quotedString})*`;
  const quotedUtf8 = String.raw`\x22${[...'utf-8'].map((character) => String.raw`(?:\\)?${character}`).join('')}\x22`;
  const charsetParameter = `(?:;\\s*charset\\s*=\\s*(?:utf-8|${quotedUtf8})\\s*)`;
  for (const [name, type] of [['HTML', 'html'], ['MARKDOWN', 'markdown']]) {
    rules.push(`# Most specific matching media range determines ${type}'s quality.`, `RewriteRule ^ - [E=DOC_${name}_Q:0]`);
    for (const range of ['\\*/\\*', 'text/\\*', `text/${type}`]) {
      // Parameter-specific ranges override bare ranges of the same media type.
      const start = `^(?:${fieldItem},)*\\s*${range}\\s*`;
      for (const specific of [false, true]) {
        const add = (pattern, quality) => rules.push(`RewriteCond %{HTTP:Accept} "${pattern}" [NC]`, `RewriteRule ^ - [E=DOC_${name}_Q:${quality}]`);
        const end = '\\s*(?:,|$)';
        add(`${start}${specific ? `${charsetParameter}+` : ''}${end}`, '1000');
        // RFC 9110 §12.5.1: q is a weight regardless of its position. Every
        // other parameter must match the representation, including after q.
        const positions = specific
          ? [[`${charsetParameter}+`, `${charsetParameter}*`], [`${charsetParameter}*`, `${charsetParameter}+`]]
          : [['', '']];
        for (const [before, after] of positions) {
          const weighted = (quality) => `${start}${before};\\s*q\\s*=\\s*${quality}\\s*${after}${end}`;
          add(weighted('1(?:\\.0{0,3})?'), '1000');
          add(weighted('0(?:\\.)?'), '0');
          for (const digits of [1, 2, 3]) {
            add(weighted(`0\\.([0-9]{${digits}})`), `%1${'0'.repeat(3 - digits)}`);
          }
        }
      }
    }
  }
  return template.replace('# GENERATED ACCEPT QUALITY RULES', rules.join('\n'));
}

export async function installApacheConfiguration(destination) {
  const target = path.join(destination, '.htaccess');
  await writeFile(target, await apacheConfiguration(), { mode: 0o644 });
  await chmod(target, 0o644);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await installApacheConfiguration(path.resolve(process.argv[2] || 'public'));
}
