import { DeclaredIcon, getSizeInPx } from 'cad/icons/DeclarativeIcon';
import { IconDeclaration } from 'cad/icons/IconDeclaration';
import React from 'react';
import { AiOutlineQuestion } from 'react-icons/ai';
import { IconType } from 'react-icons/lib';

export function resolveIcon(iconDef: IconDeclaration | IconType) {
  if (!iconDef) {
    return () => <AiOutlineQuestion />;
  }
  if (typeof iconDef === 'function') {
    const Icon = iconDef as IconType;
    return (props) => <Icon size={props?.size || 24} />;
  }
  if ((iconDef as IconDeclaration).iconType || (iconDef as IconDeclaration).iconSet) {
    return (props) => <DeclaredIcon {...iconDef as IconDeclaration} {...props}/>;
  }
  return () => <AiOutlineQuestion />;
}