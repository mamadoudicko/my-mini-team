// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'my-mini-team',
  tagline: 'Compose, run, and share agent workflows. The mmt CLI.',
  favicon: 'img/favicon.ico',

  future: {v4: true},

  url: 'https://mamadoudicko.github.io',
  baseUrl: '/my-mini-team/',

  organizationName: 'mamadoudicko',
  projectName: 'my-mini-team',

  onBrokenLinks: 'warn',

  i18n: {defaultLocale: 'en', locales: ['en']},

  // Treat .md as CommonMark (not MDX) so HTML comments (catalog markers) and
  // bare <angle> text in prose don't break the build.
  markdown: {format: 'detect'},

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/', // docs are the whole site
          editUrl: 'https://github.com/mamadoudicko/my-mini-team/tree/main/website/',
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {respectPrefersColorScheme: true},
      navbar: {
        title: 'my-mini-team',
        items: [
          {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
          {
            href: 'https://github.com/mamadoudicko/my-mini-team/tree/main/catalog',
            label: 'Catalog',
            position: 'left',
          },
          {
            href: 'https://github.com/mamadoudicko/my-mini-team',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Getting started', to: '/getting-started'},
              {label: 'Create your first team', to: '/guides/create-your-first-team'},
              {label: 'Reference', to: '/reference'},
            ],
          },
          {
            title: 'Project',
            items: [
              {label: 'GitHub', href: 'https://github.com/mamadoudicko/my-mini-team'},
              {label: 'Catalog', href: 'https://github.com/mamadoudicko/my-mini-team/tree/main/catalog'},
            ],
          },
        ],
        copyright: `my-mini-team — the mmt CLI. MIT.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
