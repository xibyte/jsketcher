import React from 'react';
import PropTypes from 'prop-types';
import {NOOP} from "../gems/func";

//TODO: remove it
export default class WindowSystem extends React.Component {

  constructor() {
    super();
  }

  componentDidMount() {
  }

  componentWillUnMount() {
  }

  render() {
    return this.props.children;
  }

  childContext = {
    setWindowMoveHandler: NOOP
  };
  
  getChildContext() {
    return this.childContext;
  }
  
  static childContextTypes = {
    setWindowMoveHandler: PropTypes.func
  }
  
}
