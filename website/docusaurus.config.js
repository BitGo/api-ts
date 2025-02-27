// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// Remove the shiki theme import that's causing the error
// const theme = require('shiki/themes/nord.json');
const { remarkCodeHike } = require('@code-hike/mdx');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'api-ts',
  tagline: 'Type- and runtime- safe TypeScript APIs',
  url: 'https://bitgo.github.io',
  baseUrl: '/api-ts/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/Shield_Logo_Blue-Dark.svg',

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
          // Update to use a default theme instead of the missing nord theme
          beforeDefaultRemarkPlugins: [[remarkCodeHike, { theme: 'github-dark' }]],
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
          alt: 'BitGo Logo',
          src: 'img/Shield_Logo_Blue-Dark.svg',
          srcDark: 'img/Shield_Logo_Blue-Dark.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Documentation',
          },
          {
            to: '/docs/how-to-guides/parsing.json-strings',
            label: 'How-to Guides',
            position: 'left',
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
                label: 'Documentation',
                to: '/docs/intro',
              },
              {
                label: 'Tutorials',
                to: '/docs/tutorial-basics/render-an-open-api-spec',
              },
              {
                label: 'How-to Guides',
                to: '/docs/how-to-guides/parsing.json-strings',
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
              {
                label: 'Twitter',
                href: 'https://twitter.com/BitGo',
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
              {
                label: 'BitGo',
                href: 'https://www.bitgo.com/',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} BitGo, Inc. All rights reserved.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),
};

module.exports = config;
