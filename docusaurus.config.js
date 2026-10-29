import { themes as prismThemes } from 'prism-react-renderer';
import { baseUrl, isDevelopment, developmentNotice, siteUrl } from './scripts/site-settings.mjs';
import { parseRepresentationFrontMatter } from './scripts/representation-routes.mjs';
import remarkBaseUrl from './scripts/remark-base-url.mjs';
import remarkVersionStatus from './scripts/remark-version-status.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createNavbarItems, libraryCategories } from './scripts/navbar-items.mjs';
import remarkLibraryLandingPages from './scripts/library-landing-pages.mjs';
import remarkSharedAssets from './scripts/remark-shared-assets.mjs';
import localSearch from './scripts/local-search.mjs';
import remarkRoadmapSupport from './scripts/roadmap-publication.mjs';

const rootDirectory = process.cwd();
let libraries = {};
try { libraries = JSON.parse(readFileSync(path.join(rootDirectory, '.docusaurus/library-versions.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
let publishedDocuments = [];
let roadmaps = {};
try { roadmaps = JSON.parse(readFileSync(path.join(rootDirectory, '.docusaurus/roadmap-support.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try {
  publishedDocuments = readdirSync(path.join(rootDirectory, '.generated-markdown'), { recursive: true })
    .filter((filename) => filename.endsWith('.md')).map((filename) => filename.split(path.sep).join('/'));
} catch (error) { if (error.code !== 'ENOENT') throw error; }
let siteVersion = 'Development documentation';
if (process.env.DOCUSAURUS_DEPLOYMENT !== 'development') {
  try {
    const tags = execFileSync('git', ['tag', '--points-at', 'HEAD'], { cwd: rootDirectory, encoding: 'utf8' })
      .trim().split('\n').filter((tag) => /^[0-9]+\.[0-9]+\.[0-9]+$/.test(tag));
    if (tags.length > 1) throw new Error('Multiple SemVer tags identify the current commit.');
    if (tags.length === 1) siteVersion = `Documentation version ${tags[0]}`;
  } catch (error) {
    if (error.message === 'Multiple SemVer tags identify the current commit.') throw error;
  }
}

const config = {
  title: isDevelopment ? 'LongitudeOne Spatial — Development' : 'LongitudeOne Spatial Documentation',
  tagline: 'Documentation for the LongitudeOne Spatial ecosystem',
  customFields: {
    productionUrl: process.env.URL_PRODUCTION || 'https://www.longitude-one.fr',
    isDevelopment,
    libraryVersions: libraries,
    publishedDocuments,
    libraryNames: Object.fromEntries(libraryCategories.flatMap(({ libraries: entries }) => entries)),
  },
  url: siteUrl,
  baseUrl,
  staticDirectories: ['static', '.generated-markdown'],
  trailingSlash: false,
  headTags: isDevelopment ? [{ tagName: 'meta', attributes: { name: 'robots', content: 'noindex, follow' } }] : [],
  clientModules: ['./src/resource-route-aliases.js', './src/roadmap-today-client.js'],
  onBrokenLinks: 'throw',
  markdown: {
    parseFrontMatter: parseRepresentationFrontMatter,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: [localSearch],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          beforeDefaultRemarkPlugins: [
            [remarkRoadmapSupport, { roadmaps, docsDirectory: path.join(rootDirectory, 'docs') }],
            [remarkSharedAssets, { docsDirectory: path.join(rootDirectory, 'docs'), baseUrl }],
            [remarkLibraryLandingPages, { libraries, docsDirectory: path.join(rootDirectory, 'docs') }],
          ],
          remarkPlugins: [
            remarkBaseUrl,
            [remarkVersionStatus, { libraries, docsDirectory: path.join(rootDirectory, 'docs') }],
          ],
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  themeConfig: {
    image: 'assets/images/social-card.png',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    footer: { style: 'dark', copyright: siteVersion, links: [{ title: 'Information', items: [
      { html: `<a href="${baseUrl}legal-notice.fr.html" lang="fr">🇫🇷 Mentions légales</a>` },
      { html: `<a href="${baseUrl}legal-notice.en.html" lang="en">🇬🇧 Legal notice</a>` },
    ] }] },
    ...(isDevelopment ? {
      announcementBar: {
        id: 'development-site',
        content: developmentNotice(),
        isCloseable: false,
        backgroundColor: '#fff3cd',
        textColor: '#332701',
      },
    } : {}),
    navbar: {
      title: 'LongitudeOne Spatial',
      items: createNavbarItems(libraries, path.join(rootDirectory, 'docs')),
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['php', 'bash'],
    },
  },
};

export default config;
