export function libraryVersionNavigation(source, { libraryVersions = {}, publishedDocuments = [], libraryNames = {} }) {
  const sourcePath = source?.replace(/^@site\/docs\//, '');
  if (!sourcePath || !publishedDocuments.includes(sourcePath)) return null;
  const [library, directory, ...rest] = sourcePath.split('/');
  const info = libraryVersions[library];
  if (!info) return null;
  const versioned = /^v[1-9][0-9]*$/.test(directory);
  if (versioned && !info.versions[directory]) return null;
  const version = versioned ? directory : null;
  const currentVersion = Object.entries(info.versions).find(([, status]) => status === 'Current')?.[0];
  const available = new Set(publishedDocuments);
  const toHtml = (target) => `/${target.replace(/\.md$/, '.html')}`;
  const versions = Object.entries(info.versions)
    .sort(([a], [b]) => Number(b.slice(1)) - Number(a.slice(1)))
    .flatMap(([targetVersion, status]) => {
      const counterpart = version && `${library}/${targetVersion}/${rest.join('/')}`;
      const entry = `${library}/${targetVersion}/index.md`;
      const target = counterpart && available.has(counterpart) ? counterpart : available.has(entry) ? entry : null;
      return target ? [{ version: targetVersion, status, to: toHtml(target), selected: targetVersion === version }] : [];
    });
  const currentEntry = currentVersion && `${library}/${currentVersion}/index.md`;
  return {
    library,
    name: libraryNames[library] ?? library,
    sourcePath,
    overview: available.has(`${library}/index.md`) ? `/${library}/index.html` : null,
    version,
    status: version ? info.versions[version] : null,
    context: version ? 'Versioned documentation' : directory === 'roadmap.md' ? 'Roadmap' : 'Library overview',
    versions,
    currentVersion: currentVersion ?? null,
    current: currentEntry && available.has(currentEntry) ? { version: currentVersion, to: toHtml(currentEntry) } : null,
  };
}
