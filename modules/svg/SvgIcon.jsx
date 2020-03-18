import React, {useEffect, useMemo, useRef} from 'react';

export function SvgIcon({content, size, ...props}) {

  const divEl = useRef(null);

  const className = size&&'icon-'+size;

  useEffect(() => {
    if (divEl.current) {
      divEl.current.innerHTML = content;
    }
  }, [divEl]);

  const style = useMemo(() => {
    return {
      display: 'flex',
      ...props.style
    };
  }, [props.style]);

  return <div className={className} ref={divEl} {...props} style={style}/>


}

