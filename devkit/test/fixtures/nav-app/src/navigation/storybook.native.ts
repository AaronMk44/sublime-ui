// Test fixture: a minimal mobile storybook authored with the @sublime-ui/ui
// runtime helpers. `loadStorybook` dynamic-imports this module's default export
// and walks the BookDef into a RouteNode tree. Components are plain named
// functions so that `component.name` carries through to the generated tree.
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
  format: 'bottomNav',
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
