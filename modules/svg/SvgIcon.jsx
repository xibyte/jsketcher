import React, {useMemo} from 'react';

export function SvgIcon({content, size, ...props}) {

  const className = size&&'icon-'+size;

  const style = useMemo(() => {
    return {
      display: 'flex',
      ...props.style
    };
  }, [props.style]);

  return <div className={className} {...props} style={style} dangerouslySetInnerHTML={{__html: content}}/>


}

