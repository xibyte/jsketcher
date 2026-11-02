import React, {useContext, useEffect, useRef} from 'react';
import {FieldId} from './Field';
import PropTypes from 'prop-types';

export default function InputControl(inprops) {

    const {type, inputRef, width, onWheel, placeholder, ...props} = inprops;

    const style = width&&{
      width
    }

    const fieldId = useContext(FieldId);
    const divRef = useRef()

    useEffect(() => {
      if (onWheel && divRef.current) {
        divRef.current.addEventListener('wheel', e => e.preventDefault(), {passive:false})
      }
    }, [divRef.current])

    return <div className={type||'text'} ref={divRef}>
      <input type='text' ref={inputRef} id={fieldId === -1 ? undefined : fieldId} {...props} placeholder={placeholder} spellCheck='false' style={style} onWheel={onWheel}/>
    </div>;

}
