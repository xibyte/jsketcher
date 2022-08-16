import React, {useCallback, useRef} from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default function NumberControl(props) {

  const {onChange, onFocus, value, width, baseStep, round, min, max, accelerator, cycle} = props;

  const onChangeFromTarget = e => {
    onChange(e.target.value);
  };

  const onWheel = (e) => {
    const delta = e.shiftKey ? e.deltaX : e.deltaY;
    const step = baseStep * (e.shiftKey ? accelerator : 1);
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    val = val + (delta < 0 ? -step : step);
    if (min !== undefined && val < min) {
      val = cycle ? max : min;
    }
    if (max !== undefined && val > max) {
      val = cycle ? min : max;
    }
    if (round !== 0) {
      val = val.toFixed(round);
    }
    onChange(val);
  };

  return <InputControl type='number'
                       value={value}
                       onChange={onChangeFromTarget}
                       onFocus={onFocus}
                       width={width}
                       onWheel={onWheel}/>
}



NumberControl.propTypes = {
  baseStep: PropTypes.number,
  round: PropTypes.number,
  min: PropTypes.number,
  max: PropTypes.number,
  accelerator: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.any
};

NumberControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};