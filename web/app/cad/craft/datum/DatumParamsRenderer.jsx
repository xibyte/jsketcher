import React from 'react';
import {pointAsColor} from 'renders';
import ColorDot from 'renders/ColorDot';


export function DatumParamsRenderer({params}) {
  const color = pointAsColor(params);
  return <ColorDot color={color} />
}