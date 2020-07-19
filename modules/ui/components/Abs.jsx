import React from 'react';

export default function Abs({left, top, right, bottom, children, style, zIndex, ...props}) {
  return <div style={{position: 'absolute', left, top, right, bottom, zIndex, ...style}}  {...props}>
    {children}
  </div>;
}

Abs.defaultProps = {
  zIndex: 100,
};





