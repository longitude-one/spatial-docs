import { themes as prismThemes } from 'prism-react-renderer';
import { baseUrl, isDevelopment, developmentNotice, siteUrl } from './scripts/site-settings.mjs';
import remarkBaseUrl from './scripts/remark-base-url.mjs';
import remarkVersionStatus from './scripts/remark-version-status.mjs';
import remarkHomeMarkdownLink from './scripts/remark-home-markdown-link.mjs';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const rootDirectory = process.cwd();
let libraries = {};
try { libraries = JSON.parse(readFileSync(path.join(rootDirectory, '.docusaurus/library-versions.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
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
  url: siteUrl,
  baseUrl,
  staticDirectories: ['static', '.generated-markdown'],
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
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
          remarkPlugins: [
            remarkBaseUrl,
            [remarkVersionStatus, { libraries, docsDirectory: path.join(rootDirectory, 'docs') }],
            [remarkHomeMarkdownLink, { docsDirectory: path.join(rootDirectory, 'docs') }],
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
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
