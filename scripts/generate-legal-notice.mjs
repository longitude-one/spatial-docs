import { readFile, writeFile, mkdir, readdir, lstat, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { legalConfiguration, legalFields } from './legal-configuration.mjs';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const literal = (value) => value.replaceAll('&', '&amp;').replace(/([\\*_\[\]])/g, '\\$1');

export async function thirdPartyNotices(root) {
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  const notices = [];
  const inventory = [];
  for (const [location, data] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (!location || data.dev) continue;
    const name = data.name || location.split('node_modules/').at(-1);
    const directory = path.join(root, location);
    let names;
    try { names = (await readdir(directory)).filter((file) => /^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(file)).sort(); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const texts = [];
    for (const file of names) if ((await lstat(path.join(directory, file))).isFile()) texts.push(await readFile(path.join(directory, file), 'utf8'));
    inventory.push({ name, version: data.version, license: data.license ?? 'Not specified', notices: names });
    notices.push(`${name}@${data.version}\nhttps://www.npmjs.com/package/${name}/v/${data.version}\nDeclared license: ${data.license ?? 'Not specified'}\n${texts.length ? texts.join('\n\n') : 'No packaged license text found; the publisher must review this package before approving publication.'}`);
  }
  return { text: `${notices.join('\n\n' + '='.repeat(72) + '\n\n')}\n`, inventory };
}

export async function generateLegalNotice(root, environment = process.env) {
  const configuration = legalConfiguration(environment);
  const template = await readFile(path.join(root, 'templates/legal-notice.md'), 'utf8');
  const replacements = { ...configuration,
    BUILD_NOTICE: configuration.testFixture ? '> **TEST ONLY — FICTIONAL LEGAL CONFIGURATION. DO NOT PUBLISH.**' : '',
  };
  const source = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, field) => {
    if (!Object.hasOwn(replacements, field)) throw new Error(`Unknown legal template field: ${field}`);
    return field === 'BUILD_NOTICE' ? replacements[field] : literal(replacements[field]);
  });
  if (/\{\{|\}\}|\$\{LEGAL_/.test(source)) throw new Error('Unresolved legal template placeholder.');
  const license = await readFile(path.join(root, 'LICENSE'));
  const thirdParty = await thirdPartyNotices(root);
  const generated = {
    'docs/legal-notice.md': source,
    'static/assets/legal/documentation-license.txt': license,
    'static/assets/legal/third-party-notices.txt': thirdParty.text,
    '.docusaurus/legal-source.json': `${JSON.stringify({ version: 1, environment: configuration.LEGAL_CONFIGURATION_ENVIRONMENT,
      approved: configuration.approved, testFixture: configuration.testFixture, sourceHash: hash(source),
      fields: legalFields, inventory: thirdParty.inventory }, null, 2)}\n`,
  };
  for (const [file, bytes] of Object.entries(generated)) {
    const target = path.join(root, file);
    let ancestor = root;
    for (const component of file.split('/')) {
      ancestor = path.join(ancestor, component);
      try { if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Generated legal resources must not be symbolic links.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(`${target}.tmp`, bytes, { flag: 'wx' });
    await rename(`${target}.tmp`, target);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateLegalNotice(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
