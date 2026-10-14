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

const rootDirectory = process.cwd();
let libraries = {};
try { libraries = JSON.parse(readFileSync(path.join(rootDirectory, '.docusaurus/library-versions.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
let publishedDocuments = [];
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
    libraryVersions: libraries,
    publishedDocuments,
    libraryNames: Object.fromEntries(libraryCategories.flatMap(({ libraries: entries }) => entries)),
  },
  url: siteUrl,
  baseUrl,
  staticDirectories: ['static', '.generated-markdown'],
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    parseFrontMatter: parseRepresentationFrontMatter,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          beforeDefaultRemarkPlugins: [
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
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    footer: { style: 'dark', copyright: siteVersion },
    ...(isDevelopment ? {
      announcementBar: {
        id: 'development-site',
        content: developmentNotice,
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
    },
  },
};

export default config;
