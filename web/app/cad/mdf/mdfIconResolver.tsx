import React from 'react';
import { SvgIcon } from "svg/SvgIcon";

export function resolveMDFIcon(iconDef: any) {
    return () => <SvgIcon content={iconDef} />
}