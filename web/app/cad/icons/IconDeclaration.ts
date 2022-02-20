export type IconDeclaration = IconSetDef | IconDef;

export enum IconSize {
  small = 'small', 
  medium = 'medium', 
  large = 'large'
}

export interface IconSetDef {
  iconType: IconType;

  iconSet: {
    [key in IconSize]: IconDef
  }     
}

export type IconType = 'image' | 'svg';

export type IconContent = any;

export type IconDef = IconContent | {
  iconType: IconType;
  iconContent: IconContent;
};
