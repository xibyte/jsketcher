import React from 'react';
import {SvgIcon} from 'svg/SvgIcon';
import mirrorContent from './mirror-generator.svg';
import offsetContent from './offset-generator.svg';

export function MirrorGeneratorIcon(props) {

  return <SvgIcon content={mirrorContent} {...props}/>
}

export function OffsetGeneratorIcon(props) {

  return <SvgIcon content={offsetContent} {...props}/>
}