import { themes as prismThemes } from 'prism-react-renderer';
import { baseUrl, isDevelopment, developmentNotice } from './scripts/site-settings.mjs';
import remarkBaseUrl from './scripts/remark-base-url.mjs';

const config = {
  title: isDevelopment ? 'LongitudeOne Spatial — Development' : 'LongitudeOne Spatial Documentation',
  tagline: 'Documentation for the LongitudeOne Spatial ecosystem',
  url: 'https://longitude-one.github.io',
  baseUrl,
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
          remarkPlugins: [remarkBaseUrl],
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