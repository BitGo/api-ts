// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const theme = require('shiki/themes/nord.json');
const { remarkCodeHike } = require('@code-hike/mdx');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'api-ts home',
  tagline: 'Type- and runtime- safe TypeScript APIs',
  url: 'https://bitgo.github.io/api-ts/',
  baseUrl: '/api-ts/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'BitGo', // Usually your GitHub org/user name.
  projectName: 'api-ts', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          beforeDefaultRemarkPlugins: [[remarkCodeHike, { theme }]],
          sidebarPath: require.resolve('./sidebars.js'),
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/BitGo/api-ts/tree/master/website/',
        },
        blog: {
          showReadingTime: true,
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/BitGo/api-ts/tree/master/website',
        },
        theme: {
          customCss: [
            require.resolve('@code-hike/mdx/styles.css'),
            require.resolve('./src/css/custom.css'),
          ],
        },
      }),
    ],
  ],

  themes: ['mdx-v2'],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'api-ts',
        logo: {
          alt: 'api-ts Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Tutorial',
          },
          {
            href: 'https://github.com/BitGo/api-ts',
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
              {
                label: 'Tutorial',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/api-ts',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/BitGo/api-ts',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} BitGo, Inc.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
