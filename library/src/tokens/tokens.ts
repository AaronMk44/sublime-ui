export interface ColorTokens {
  primary: string; primaryFg: string;
  secondary: string; secondaryFg: string;
  success: string; warning: string; danger: string; info: string;
  background: string; foreground: string; mutedFg: string;
  surface: string; surfaceBorder: string; surfaceHover: string;
  glassBg: string; glassBorder: string; divider: string; ring: string;
  primarySoftBg: string; primarySoftFg: string;
  successSoftBg: string; successSoftFg: string;
  warningSoftBg: string; warningSoftFg: string;
  dangerSoftBg: string; dangerSoftFg: string;
  infoSoftBg: string; infoSoftFg: string;
}

export interface SublimeTokens {
  color: { light: ColorTokens; dark: ColorTokens };
  radii: { sm: number; md: number; lg: number; full: number };
  shadows: { sm: string; md: string; lg: string };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: {
    family: string;
    sizes: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
    weights: { regular: number; medium: number; semibold: number; bold: number };
  };
}

const light: ColorTokens = {
  primary: 'rgb(37,99,235)', primaryFg: 'rgb(255,255,255)',
  secondary: 'rgb(100,116,139)', secondaryFg: 'rgb(255,255,255)',
  success: 'rgb(22,163,74)', warning: 'rgb(217,119,6)', danger: 'rgb(220,38,38)', info: 'rgb(2,132,199)',
  background: 'rgb(247,250,255)', foreground: 'rgb(15,23,42)', mutedFg: 'rgba(71,85,105,0.85)',
  surface: 'rgba(243,248,255,0.90)', surfaceBorder: 'rgba(15,23,42,0.08)', surfaceHover: 'rgba(59,130,246,0.06)',
  glassBg: 'rgba(236,244,255,0.60)', glassBorder: 'rgba(15,23,42,0.08)', divider: 'rgba(15,23,42,0.06)',
  ring: 'rgba(59,130,246,0.45)',
  primarySoftBg: 'rgba(59,130,246,0.08)', primarySoftFg: 'rgb(29,78,216)',
  successSoftBg: 'rgba(34,197,94,0.10)', successSoftFg: 'rgb(21,128,61)',
  warningSoftBg: 'rgba(245,158,11,0.12)', warningSoftFg: 'rgb(180,83,9)',
  dangerSoftBg: 'rgba(244,63,94,0.08)', dangerSoftFg: 'rgb(190,18,60)',
  infoSoftBg: 'rgba(14,165,233,0.10)', infoSoftFg: 'rgb(3,105,161)',
};

const dark: ColorTokens = {
  primary: 'rgb(96,165,250)', primaryFg: 'rgb(8,12,20)',
  secondary: 'rgb(148,163,184)', secondaryFg: 'rgb(8,12,20)',
  success: 'rgb(74,222,128)', warning: 'rgb(251,191,36)', danger: 'rgb(251,113,133)', info: 'rgb(56,189,248)',
  background: 'rgb(8,12,20)', foreground: 'rgb(245,247,251)', mutedFg: 'rgba(229,231,235,0.65)',
  surface: 'rgba(96,165,250,0.06)', surfaceBorder: 'rgba(255,255,255,0.08)', surfaceHover: 'rgba(255,255,255,0.06)',
  glassBg: 'rgba(96,165,250,0.05)', glassBorder: 'rgba(255,255,255,0.08)', divider: 'rgba(255,255,255,0.06)',
  ring: 'rgba(96,165,250,0.55)',
  primarySoftBg: 'rgba(59,130,246,0.12)', primarySoftFg: 'rgb(147,197,253)',
  successSoftBg: 'rgba(34,197,94,0.16)', successSoftFg: 'rgb(134,239,172)',
  warningSoftBg: 'rgba(245,158,11,0.18)', warningSoftFg: 'rgb(253,224,71)',
  dangerSoftBg: 'rgba(244,63,94,0.18)', dangerSoftFg: 'rgb(253,164,175)',
  infoSoftBg: 'rgba(14,165,233,0.16)', infoSoftFg: 'rgb(125,211,252)',
};

export const defaultTokens: SublimeTokens = {
  color: { light, dark },
  radii: { sm: 8, md: 12, lg: 16, full: 999 },
  shadows: {
    sm: '0 1px 2px rgba(15,23,42,0.06)',
    md: '0 4px 12px rgba(15,23,42,0.10)',
    lg: '0 12px 32px rgba(15,23,42,0.16)',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  typography: {
    family: 'Inter, system-ui, sans-serif',
    sizes: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, '2xl': 28 },
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
};
