import React, {useEffect, useMemo, useRef} from 'react';

export function SvgIcon({content, ...props}) {

  const divEl = useRef(null);

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

  return <div ref={divEl} {...props} style={style}/>


}

