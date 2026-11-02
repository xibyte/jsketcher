import React, {useMemo} from 'react';

export function SvgIcon({content, size, ...props}: {
  content: string,
  size?: number|string
} & React.HTMLAttributes<HTMLDivElement>) {

  const className = size&&'icon-'+size;

  const style = useMemo(() => {
    return {
      display: 'flex',
      width: typeof size === 'number' ? size + 'px' : size,
      height: typeof size === 'number' ? size + 'px' : size,
      ...props.style
    };
  }, [size, props.style]);

  return <div className={className} {...props} style={style} dangerouslySetInnerHTML={{__html: content}}/>


}

