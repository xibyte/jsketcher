import React from 'react';
  
export default function Card({visible, children, ...props}) {
  return <div style={
    {
      display: visible ? 'block' : 'none',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      right: 0
    }
  } {...props}>
    {children}
  </div>
}