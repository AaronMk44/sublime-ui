import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Sublime UI',
  tagline: 'Write the non-UI parts once. Run on mobile, web, and desktop — in TypeScript.',
  favicon: 'img/favicon.svg',

  // GitHub Pages (project site at https://sublime-ui.github.io/sublime-ui/)
  url: 'https://sublime-ui.github.io',
  baseUrl: '/sublime-ui/',
  organizationName: 'sublime-ui',
  projectName: 'sublime-ui',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  markdown: { hooks: { onBrokenMarkdownLinks: 'warn' } },

  // Brand fonts (Strata): Sora · Manrope · IBM Plex Mono — self-hosted, offline-safe.
  clientModules: ['./src/fonts.ts'],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs', // landing page owns '/'
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/sublime-ui/sublime-ui/tree/main/website/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: 'Sublime UI',
      logo: { alt: 'Sublime UI', src: 'img/logo.svg' },
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
            { label: 'Introduction', to: '/docs/' },
            { label: 'Framework', to: '/docs/framework/overview' },
            { label: 'Navigation', to: '/docs/navigation/storybook' },
            { label: 'Desktop', to: '/docs/desktop/overview' },
          ],
        },
        {
          title: 'More',
          items: [{ label: 'GitHub', href: 'https://github.com/sublime-ui/sublime-ui' }],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Sublime UI · build once · ship everywhere.`,
    },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
  } satisfies Preset.ThemeConfig,
};

export default config;
