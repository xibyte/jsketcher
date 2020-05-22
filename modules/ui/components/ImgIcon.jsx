import React from 'react';

export default function ImgIcon({url, size, style, ...props}) {
  return <span className='img-icon' style={{
    display: 'inline-block',
    backgroundImage: 'url('+url+')',
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${size}px ${size}px`,
    width: size + 'px',
    height: size + 'px',
    ...style
  }} {...props} />
};