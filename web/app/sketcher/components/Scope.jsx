import React from "react";

export class Scope extends React.Component {

  state = {
    hasError: false,
  };

  recover = () => {
    toRecover.delete(this.recover);
    this.setState({hasError: false});
  };

  componentDidCatch(e) {
    this.setState({hasError: true});
    setTimeout(() => toRecover.add(this.recover), 300);
    console.error(e);
  }

  render() {
    if (this.state.hasError) {
      return this.props.message || null;
    }
    return this.props.children;
  }
}

const toRecover = new Set();

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener("mouseup", function( e ) {
    setTimeout(() => toRecover.forEach(r => r()), 300);
  }, false)
}, false);
