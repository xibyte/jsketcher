import React from 'react';
import PropTypes from 'prop-types';

import ls from './Window.less'
import Fa from "./Fa";

export default class Window extends React.Component {
  
  constructor({initWidth}) {
    super();
    this.state = {
      width: initWidth
    }
  }
  
  render() {
    let {children, title, minimizable } = this.props;
    return <div className={ls.root} style={this.getStyle()}>
      <div className={ls.bar}>
        {title}
        <div className={ls.controlButtons}>
          {minimizable &&  <span className={ls.button}>_</span>}
          <span className={ls.button}><Fa icon='close' /></span>
      </div>
      </div>
      {children}
    </div>

  }
  
  getStyle() {
    return {
      width: toPx(this.state.width),
      height: toPx(this.state.height),
      left: toPx(this.state.left),
      top: toPx(this.state.top)
    }
  }
}

Window.defaultProps = {
  minimizable: false,
};

function toPx(val) {
  return val === undefined ? undefined : val + 'px';
}

