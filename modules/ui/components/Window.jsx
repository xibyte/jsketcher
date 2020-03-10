import React from 'react';

import ls from './Window.less'
import Fa from "./Fa";
import WindowSystem from '../WindowSystem';
import cx from 'classnames';

export default class Window extends React.Component {
  
  constructor({initWidth, initLeft, initTop, initRight, initHeight}) {
    super();
    this.state = {
      width: initWidth,
      height: initHeight,
      left: initLeft,
      top: initTop,
      right: initRight
    };
    this.dragOrigin = null;
  }
  
  render() {
    let {initWidth, initHeight, initLeft, initTop, setFocus, className, 
      children, title, icon, minimizable, onClose, ...props} = this.props;
    return <div className={cx(ls.root, className)} style={this.getStyle()} {...props} ref={this.keepRef}>
      <div className={ls.bar + ' disable-selection'} onMouseDown={this.startDrag} onMouseUp={this.stopDrag}>
        <div>{icon}<b>{title.toUpperCase()}</b></div>  
        <div className={ls.controlButtons}>
          {minimizable &&  <span className={ls.button}>_</span>}
          <span className={ls.button} onClick={onClose}><Fa fw icon='close' /></span>
        </div>
      </div>
      <div className={ls.content}>
        {children}
      </div>
    </div>

  }
  
  getStyle() {
    return {
      width: this.state.width,
      height: this.state.height,
      left: this.state.left,
      top: this.state.top
    }
  }
  
  componentDidMount() {
    if (this.props.setFocus) {
      this.props.setFocus(this.el);
    } else {
      this.el.focus();
    }
  }

  startDrag = e => {
    this.dragOrigin = {x : e.pageX, y : e.pageY};
    let left = this.state.left;
    let top = this.state.top;
    if (left === undefined) {
      left = this.el.offsetLeft;
    }
    if (top === undefined) {
      top = this.el.offsetTop;
    }
    this.originLocation = {
      left,
      top,
      right: undefined
    };

    this.handlerToRestore = document.body.onmousemove;
    document.body.onmousemove = this.doDrag;
  };
  
  doDrag = e => {
    if (this.dragOrigin) {
      let dx = e.pageX - this.dragOrigin.x;
      let dy = e.pageY - this.dragOrigin.y;
      this.setState({left : this.originLocation.left + dx, top : this.originLocation.top + dy});
    }
  };

  stopDrag = e => {
    this.dragOrigin = null;
    document.body.onmousemove = this.handlerToRestore;
  };

  keepRef = el => this.el = el;
  
}

Window.defaultProps = {
  minimizable: false,
};


