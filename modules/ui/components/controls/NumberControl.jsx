import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export default class NumberControl extends React.Component {
  
  render() {
    let {onChange, value} = this.props;
    return <InputControl type='number' 
              onWheel={this.onWheel} 
              value={ Math.round(value * 1000) / 1000 } 
              onChange={this.onChange}
              inputRef={input => this.input = input} /> 
  }
  
  onChange = e => {
    let val;
    try {
      val = parseFloat(e.target.value)
    } catch (ignore) {
      return;
    }
    if (!isNaN(val)) {
      this.props.onChange(val);
    }
  };
  
  onWheel = (e) => {
    let {baseStep, round, min, max, onChange, accelerator} = this.props;
    let delta = e.deltaY;
    let val = e.target.value;
    if (!val) val = 0;
    let step = baseStep * (e.shiftKey ? accelerator : 1);
    val = parseFloat(val) + (delta < 0 ? -step : step);
    if (min !== undefined && val < min) {
      val = min;
    }
    if (max !== undefined && val > max) {
      val = max;
    }
    if (round !== 0) {
      val = val.toFixed(round);
    }
    this.input.value = val;
    onChange(val);
    e.preventDefault();
    e.stopPropagation();
  }
}

NumberControl.propTypes = {
  baseStep: PropTypes.number, 
  round: PropTypes.number, 
  min: PropTypes.number, 
  max: PropTypes.number, 
  accelerator: PropTypes.number, 
  value: PropTypes.number.isRequired, 
  onChange: PropTypes.func.isRequired
};

NumberControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};