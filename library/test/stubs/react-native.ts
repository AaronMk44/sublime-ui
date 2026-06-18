/**
 * Minimal `react-native` stub for jsdom/web vitest runs.
 *
 * `generateThemes` imports `MD3LightTheme`/`MD3DarkTheme` from
 * `react-native-paper`, whose compiled barrel transitively `require`s
 * `react-native` (Flow source that vitest cannot transform). Web tests must
 * never load real react-native source, so we alias it to this stub. It only
 * needs to be load-bearing enough for Paper's modules to evaluate; the MD3
 * theme constants are static colour data and need no RN runtime behaviour.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const noop = (): void => {};
const passthrough = (x: any): any => x;

const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => style ?? {},
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
  compose: (a: any, b: any) => [a, b],
};

const Platform = {
  OS: 'web' as const,
  select: (obj: any) => (obj && (obj.web ?? obj.default)) as any,
  Version: 0,
};

const PixelRatio = {
  get: () => 1,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (n: number) => n,
  roundToNearestPixel: (n: number) => n,
};

const Dimensions = {
  get: () => ({ width: 0, height: 0, scale: 1, fontScale: 1 }),
  addEventListener: () => ({ remove: noop }),
  removeEventListener: noop,
};

const Animated = {
  Value: class {
    constructor(_v?: number) {}
    setValue = noop;
    interpolate = passthrough;
    addListener = () => '';
    removeListener = noop;
  },
  View: 'Animated.View',
  Text: 'Animated.Text',
  ScrollView: 'Animated.ScrollView',
  timing: () => ({ start: noop, stop: noop }),
  spring: () => ({ start: noop, stop: noop }),
  parallel: () => ({ start: noop, stop: noop }),
  sequence: () => ({ start: noop, stop: noop }),
  loop: () => ({ start: noop, stop: noop }),
  createAnimatedComponent: passthrough,
};

const Appearance = {
  getColorScheme: () => 'light' as const,
  addChangeListener: () => ({ remove: noop }),
};

const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  addEventListener: () => ({ remove: noop }),
};

const Keyboard = {
  addListener: () => ({ remove: noop }),
  dismiss: noop,
};

const BackHandler = {
  addEventListener: () => ({ remove: noop }),
  removeEventListener: noop,
};

const I18nManager = { isRTL: false, getConstants: () => ({ isRTL: false }) };

const NativeModules: Record<string, unknown> = {};

const useWindowDimensions = () => ({ width: 0, height: 0, scale: 1, fontScale: 1 });

export {
  StyleSheet,
  Platform,
  PixelRatio,
  Dimensions,
  Animated,
  Appearance,
  AccessibilityInfo,
  Keyboard,
  BackHandler,
  I18nManager,
  I18nManager as I,
  NativeModules,
  useWindowDimensions,
};

export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const ScrollView = 'ScrollView';
export const Pressable = 'Pressable';
export const Switch = 'Switch';
export const TextInput = 'TextInput';
export const Easing = {
  linear: passthrough,
  ease: passthrough,
  in: passthrough,
  out: passthrough,
  inOut: passthrough,
  bezier: () => passthrough,
};
