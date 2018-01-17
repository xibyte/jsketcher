import React from 'react';
import PropTypes from 'prop-types';

import ls from './InputControl.less'

export default class InputControl extends React.Component {
  
  render() {
    let {type, inputRef, ...props} = this.props;
    
    return <div className={ls[type]}>
      <input type='text' ref={inputRef} {...props} spellcheck='false' />
    </div>;
  }
}

InputControl.propTypes = {
  type: PropTypes.oneOf(['number', 'text']), 
};

InputControl.defaultProps = {
  type: 'text'
};