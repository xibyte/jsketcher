import { DeclaredIcon } from 'cad/icons/DeclarativeIcon';
import { IconDeclaration } from 'cad/icons/IconDeclaration';
import React from 'react';
import { AiOutlineQuestion } from 'react-icons/ai';
import { IconType } from 'react-icons/lib';

export function resolveMDFIcon(iconDef: IconDeclaration | IconType) {
    if (iconDef.iconType || iconDef.iconSet) {
        return (props) => <DeclaredIcon {...iconDef} {...props}/>
    } else {
        if (!iconDef || typeof(iconDef) !== 'object') {
            return AiOutlineQuestion;
        }        
        return iconDef;
    }
}