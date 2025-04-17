/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Tutorial - Basics',
      items: [
        'tutorial-basics/create-an-api-spec',
        'tutorial-basics/create-an-http-server',
        'tutorial-basics/create-an-http-client',
        'tutorial-basics/render-an-open-api-spec',
      ],
    },
    {
      type: 'category',
      label: 'How-To Guides',
      items: [
        'how-to-guides/intermediate-semantic-analysis',
        'how-to-guides/parsing.json-strings',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        {
          type: 'category',
          label: 'io-ts-http',
          link: {
            type: 'doc',
            id: 'reference/io-ts-http/index',
          },
          items: [
            'reference/io-ts-http/apispec',
            'reference/io-ts-http/httpRoute',
            'reference/io-ts-http/httpRequest',
            {
              type: 'category',
              label: 'Combinators',
              link: {
                type: 'doc',
                id: 'reference/io-ts-http/combinators/index',
              },
              items: [
                'reference/io-ts-http/combinators/optional',
                'reference/io-ts-http/combinators/optionalize',
                'reference/io-ts-http/combinators/flattened',
              ],
            },
            'reference/io-ts-http/interfaces',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
