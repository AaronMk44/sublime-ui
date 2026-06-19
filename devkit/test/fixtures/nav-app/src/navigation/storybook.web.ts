// Test fixture: a minimal web storybook authored with the @sublime-ui/ui
// runtime helpers. Uses web-valid formats (sidebar/stack). Components are plain
// named functions so `component.name` carries through to the generated tree.
import { book, link, page } from '@sublime-ui/ui/navigation';

export function Home() {
  return null;
}

export function ProductDetail() {
  return null;
}

export function Profile() {
  return null;
}

const settingsBook = book({
  format: 'stack',
  pages: {
    profile: page(Profile, { title: 'Profile' }),
  },
});

export default book({
  format: 'sidebar',
  pages: {
    home: page(Home, { title: 'Home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings' }),
  },
});
