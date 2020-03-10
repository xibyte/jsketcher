import React from 'react';
import PropTypes from 'prop-types';

export default class InputControl extends React.Component {
  
  render() {
    let {type, inputRef, ...props} = this.props;
    
    return <div className={type}>
      <input type='text' ref={inputRef} {...props} spellCheck='false' />
    </div>;
  }
}

InputControl.propTypes = {
  type: PropTypes.oneOf(['number', 'text']), 
};

InputControl.defaultProps = {
  type: 'text'
};