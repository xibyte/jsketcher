import React from 'react';
import PropTypes from 'prop-types';

import ls from './Window.less'
import Fa from "./Fa";

export default class Window extends React.Component {
  
  constructor({initWidth, initLeft, initTop}) {
    super();
    this.state = {
      width: initWidth,
      left: initLeft,
      top: initTop
    }
  }
  
  render() {
    let {children, title, minimizable, onClose} = this.props;
    return <div className={ls.root} style={this.getStyle()}>
      <div className={ls.bar + ' disable-selection'}>
        <div><b>{title.toUpperCase()}</b></div>  
        <div className={ls.controlButtons}>
          {minimizable &&  <span className={ls.button}>_</span>}
          <span className={ls.button} onClick={onClose}><Fa fw icon='close' /></span>
      </div>
      </div>
      {children}
    </div>

  }
  
  getStyle() {
    return {
      width: this.state.width,
      height: this.state.height,
      left: this.state.left,
      top: this.state.top,
      zIndex: 1
    }
  }
}

Window.defaultProps = {
  minimizable: false,
};


