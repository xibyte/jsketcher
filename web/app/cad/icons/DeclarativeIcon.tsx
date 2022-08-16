import React from 'react'
import { SvgIcon } from 'svg/SvgIcon';
import ImgIcon from 'ui/components/ImgIcon';
import { IconContent, IconDeclaration, IconSetDef, IconSize, IconType } from './IconDeclaration';


interface IconRenderProps {
  size: IconSize
}

export function DeclaredIcon({iconSet, iconType, ...props}: IconRenderProps & IconDeclaration & React.HTMLAttributes<HTMLDivElement>) {

  if (iconSet) {
    return <IconSet iconSet={iconSet} {...props} />
  } else {
    return <Icon iconType={iconType} {...props} />
  }
}

function IconSet(props: IconRenderProps & IconSetDef & React.HTMLAttributes<HTMLDivElement>) {

  const {iconSet} = props;

  const iconDef = iconSet[props.size] || iconSet[IconSize.large] || iconSet[IconSize.medium] || iconSet[IconSize.small];

  return <Icon {...iconDef} {...props} />;
}

function Icon(props: {
  iconType: IconType,
  iconContent: IconContent
  size: IconSize
} & React.HTMLAttributes<HTMLDivElement>) {

  const {iconContent, size, iconType, ...htmlProps} = props;

  const sizeInPx = getSizeInPx(size);

  if (iconType === 'image') {
    return <ImgIcon url={iconContent} size={sizeInPx} {...htmlProps}/> 
  } else if (props.iconType === 'svg') {
    return <SvgIcon content={iconContent} size={sizeInPx} {...htmlProps}/> 
  } else {
    throw 'unsupported icon type ' + iconType;  
  }


}

export function getSizeInPx(sizeName: IconSize): number {
  switch (sizeName) {
    case 'small': return 16;
    case 'medium': return 24;
    case 'large': 
    default:
      return 48;
  }
} 