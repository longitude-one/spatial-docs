import searchLocal from '@easyops-cn/docusaurus-search-local';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const searchOptions = {
  indexDocs: true,
  indexBlog: false,
  indexPages: false,
  docsRouteBasePath: '/',
  hashed: 'filename',
  explicitSearchResultPath: true,
  searchContextByPaths: [],
  searchBarShortcut: true,
  highlightSearchTermsOnTargetPage: false,
  // Preproduction is excluded from public search engines, not our local index.
  forceIgnoreNoIndex: true,
};

export function searchContext(url, baseUrl, fields) {
  const [library, version] = url.slice(baseUrl.length).split('/');
  const name = fields.libraryNames?.[library];
  if (name) {
    const status = fields.libraryVersions?.[library]?.versions?.[version];
    return [name, ...(status ? [`${version} (${status})`] : [])];
  }
  return [{ standards: 'Standards', concepts: 'Concepts', dbms: 'DBMS', shared: 'Shared documentation', about: 'About' }[library] ?? 'Documentation'];
}

export function finalizeSearchIndex(index, expectedUrls, baseUrl, fields) {
  if (!Array.isArray(index) || !index.length || index.some((group) => !Array.isArray(group.documents) || !group.index)) {
    throw new Error('Local search index has an unsupported structure.');
  }
  const expected = new Set(expectedUrls);
  const indexed = new Set();
  for (const group of index) {
    for (const document of group.documents) {
      const url = `${document.u}.html`;
      if (!expected.has(url)) throw new Error(`Search result is not a published HTML document: ${url}`);
      document.u = url;
      if (document.b) document.b = searchContext(url, baseUrl, fields).concat(document.b);
      indexed.add(url);
    }
  }
  if (indexed.size !== expected.size || [...expected].some((url) => !indexed.has(url))) {
    throw new Error('Local search index must cover every published document.');
  }
  return index;
}

// Keep the provider-specific route/schema adaptation isolated here. The provider
// appends .html to Docusaurus routes, while our routes already include .html.
export default function localSearch(context) {
  const provider = searchLocal.default(context, searchLocal.validateOptions({ options: searchOptions, validate(schema, options) {
    const result = schema.validate(options);
    if (result.error) throw result.error;
    return result.value;
  } }));
  return {
    ...provider,
    async contentLoaded({ actions }) {
      await provider.contentLoaded({ actions: { ...actions, addRoute(route) {
        actions.addRoute({ ...route, path: `${context.baseUrl}search.html` });
      } } });
    },
    configureWebpack(...args) {
      return {
        ...provider.configureWebpack(...args),
        module: { rules: [{
          test: /@easyops-cn[/\\]docusaurus-search-local[/\\].*[/\\]SearchBar[/\\]SearchBar\.jsx$/,
          use: [{ loader: path.join(context.siteDir, 'scripts/search-route-loader.cjs') }],
        }] },
      };
    },
    async postBuild(data) {
      const docsPlugins = data.plugins.filter((plugin) => plugin.name === 'docusaurus-plugin-content-docs');
      const urls = docsPlugins.flatMap((plugin) => plugin.content.loadedVersions.flatMap((version) =>
        version.docs.filter((doc) => !doc.unlisted && !doc.frontMatter?.draft && !doc.frontMatter?.unlisted).map((doc) => doc.permalink)));
      const withoutExtension = (url) => url.replace(/\.html$/, '');
      await provider.postBuild({
        ...data,
        routesPaths: urls.map(withoutExtension),
        plugins: docsPlugins.map((plugin) => ({
          ...plugin,
          content: { ...plugin.content, loadedVersions: plugin.content.loadedVersions.map((version) => ({
            ...version,
            docs: version.docs.map((doc) => ({ ...doc, permalink: withoutExtension(doc.permalink) })),
          })) },
        })),
      });
      const files = (await readdir(data.outDir)).filter((name) => /^search-index(?:-[a-f0-9]+)?\.json$/.test(name));
      if (files.length !== 1) throw new Error('Expected one global local-search index.');
      const filename = path.join(data.outDir, files[0]);
      const index = finalizeSearchIndex(JSON.parse(await readFile(filename, 'utf8')), urls, data.baseUrl, context.siteConfig.customFields);
      await writeFile(filename, JSON.stringify(index));
    },
  };
}
