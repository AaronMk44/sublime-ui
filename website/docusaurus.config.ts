import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Sublime UI',
  tagline: 'Write the non-UI parts once. Run on mobile, web, and desktop — in TypeScript.',
  favicon: 'img/favicon.ico',

  url: 'https://sublime-ui.dev',
  baseUrl: '/',

  organizationName: 'sublime-ui',
  projectName: 'sublime-ui',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs-only site
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/sublime-ui/sublime-ui/tree/main/website/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Sublime UI',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
        { href: 'https://github.com/sublime-ui/sublime-ui', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'Framework', to: '/framework/overview' },
            { label: 'Navigation', to: '/navigation/storybook' },
            { label: 'Desktop', to: '/desktop/overview' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Sublime UI.`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
