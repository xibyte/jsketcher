interface Theme {

  huePrim: string;
  saturation: string;

  bgColor0: string;
  bgColor1: string;
  bgColor2: string;
  bgColor3: string;
  bgColor4: string;
  bgColor5: string;
  bgColor6: string;
  bgColor7: string;
  bgColor8: string;
  bgColor9: string;

  bgBaseColor: string;

  fontColorEmpph: string;
  fontColor: string;
  fontColorMinor: string;
  fontColorSuppressed: string;
  fontColorDisabled: string;

  borderColor: string;

  controlColorNumber: string;
  controlColorText: string;
  controlBg: string;

  workAreaColor: string;

  workAreaControlBarBgColor: string;
  workAreaControlBarBgColorActive: string;
  workAreaControlBarFontColor: string;

  colorDanger: string;
  colorAccent: string;

  colorNeutral: string;
  colorHighlight: string;

  colorBtnSelected: string;

  onColorHighlight: string;
  onColorHighlightVariantYellow: string;
  onColorHighlightVariantPink: string;
  onColorHighlightVariantRed: string;
  onColorHighlightVariantGreen: string;
  onColorHighlightVariantBlue: string;

}

const cssVarNames: Record<keyof Theme, string> = {
  huePrim: '--hue-prim',
  saturation: '--saturation',
  bgColor0: '--bg-color-0',
  bgColor1: '--bg-color-1',
  bgColor2: '--bg-color-2',
  bgColor3: '--bg-color-3',
  bgColor4: '--bg-color-4',
  bgColor5: '--bg-color-5',
  bgColor6: '--bg-color-6',
  bgColor7: '--bg-color-7',
  bgColor8: '--bg-color-8',
  bgColor9: '--bg-color-9',
  bgBaseColor: '--bg-base-color',
  fontColorEmpph: '--font-color-empph',
  fontColor: '--font-color',
  fontColorMinor: '--font-color-minor',
  fontColorSuppressed: '--font-color-suppressed',
  fontColorDisabled: '--font-color-disabled',
  borderColor: '--border-color',
  controlColorNumber: '--control-color-number',
  controlColorText: '--control-color-text',
  controlBg: '--control-bg',
  workAreaColor: '--work-area-color',
  workAreaControlBarBgColor: '--work-area-control-bar-bg-color',
  workAreaControlBarBgColorActive: '--work-area-control-bar-bg-color-active',
  workAreaControlBarFontColor: '--work-area-control-bar-font-color',
  colorDanger: '--color-danger',
  colorAccent: '--color-accent',
  colorNeutral: '--color-neutral',
  colorHighlight: '--color-highlight',
  colorBtnSelected: '--color-btn-selected',
  onColorHighlight: '--on-color-highlight',
  onColorHighlightVariantYellow: '--on-color-highlight-variant-yellow',
  onColorHighlightVariantPink: '--on-color-highlight-variant-pink',
  onColorHighlightVariantRed: '--on-color-highlight-variant-red',
  onColorHighlightVariantGreen: '--on-color-highlight-variant-green',
  onColorHighlightVariantBlue: '--on-color-highlight-variant-blue',
};

function resolveVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const handler: ProxyHandler<Theme> = {
  get(_target, prop: string) {
    const cssName = cssVarNames[prop as keyof Theme];
    if (!cssName) return undefined;
    return resolveVar(cssName);
  }
};

export default new Proxy({} as Theme, handler);
