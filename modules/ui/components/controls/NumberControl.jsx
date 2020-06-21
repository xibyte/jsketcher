import React, {useCallback, useRef} from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default function NumberControl(props) {

  let {onChange, onFocus, value} = props;

  const onChangeFromTarget = e => {
    onChange(e.target.value);
  };

  const attachWheelListener = useCallback((input) => {
    if (!input) {
      return;
    }
    const onWheel = (e) => {
      let {baseStep, round, min, max, onChange, accelerator} = props;
      let delta = e.shiftKey ? e.deltaX : e.deltaY;
      let step = baseStep * (e.shiftKey ? accelerator : 1);
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 0;
      val = val + (delta < 0 ? -step : step);
      if (min !== undefined && val < min) {
        val = min;
      }
      if (max !== undefined && val > max) {
        val = max;
      }
      if (round !== 0) {
        val = val.toFixed(round);
      }
      input.value = val;
      onChange(val);
      e.preventDefault();
      e.stopPropagation();
    };
    input.addEventListener('wheel', onWheel, {passive: false});
  }, []);

  return <InputControl type='number'
                       value={value}
                       onChange={onChangeFromTarget}
                       onFocus={onFocus}
                       inputRef={attachWheelListener}/>

}



NumberControl.propTypes = {
  baseStep: PropTypes.number,
  round: PropTypes.number,
  min: PropTypes.number,
  max: PropTypes.number,
  accelerator: PropTypes.number,
  onChange: PropTypes.func.isRequired
};

NumberControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};