import React from 'react';
import PropTypes from 'prop-types';

import ls from './NumberControl.less'

export default class NumberControl extends React.Component{
  
  render() {
    let {initValue, } = this.props;
    
    return <div className={ls.root}>
      <input type='text' defaultValue={initValue} 
             ref={(input) => this.input = input} 
             onWheel={this.onWheel} 
             onChange={e => onChange(e.target.value)} />
    </div>;
  }
  
  onWheel = (e) => {
    let {baseStep, round, min, max, onChange, accelerator} = this.props;
    let delta = 0;
    if ( e.wheelDelta ) { // WebKit / Opera / Explorer 9
      delta = e.wheelDelta;
    } else if ( e.detail ) { // Firefox
      delta = - e.detail;
    }
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
  initValue: PropTypes.number.isRequired, 
  onChange: PropTypes.func.isRequired
};

NumberControl.defaultProps = {
  baseStep: 1,
  round: 0,
  accelerator: 100
};