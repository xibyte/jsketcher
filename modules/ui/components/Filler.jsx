import React from 'react';

export default function Filler({width, height, children, style, ...props}) {
  return <span style={{
    display: 'inline-block',
    width,
    height,
    ...style
  }}>
    {children}
  </span>
}