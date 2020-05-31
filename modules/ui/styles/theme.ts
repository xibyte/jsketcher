import theme from "!!less-vars-loader?camelCase&resolveVariables!./theme.less";

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

export default <Theme>(theme as unknown);