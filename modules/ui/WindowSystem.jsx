import React from 'react';
import PropTypes from 'prop-types';

export default class WindowSystem extends React.Component {

  constructor() {
    super();
    this.moveHandler = null;
  }

  componentDidMount() {
    document.body.onmousemove = e => {
      if (this.moveHandler !== null) {
        this.moveHandler(e);
      }
    };
  }

  componentWillUnMount() {
  }

  render() {
    return this.props.children;
  }

  childContext = {
    setWindowMoveHandler: moveHandler => this.moveHandler = moveHandler
  };
  
  getChildContext() {
    return this.childContext;
  }
  
  static childContextTypes = {
    setWindowMoveHandler: PropTypes.func
  }
  
}
