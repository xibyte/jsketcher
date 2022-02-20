import React from 'react';

type ImgIconParams = { url: string; size: string|number; style?: any; };

export default function ImgIcon(inprops: ImgIconParams) {

  const {url, size, style, ...props} = inprops;

  return <span className='img-icon' style={{
    display: 'inline-block',
    backgroundImage: 'url('+url+')',
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${size}px ${size}px`,
    width: size + 'px',
    height: size + 'px',
    ...style
  }} {...props} />
}