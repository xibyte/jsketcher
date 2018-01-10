import React from 'react';

export default class WindowSystem extends React.Component {

  constructor() {
    super();
    this.state = {
      windows: []
    }
  }

  render() {
    return this.state.windows;
  }
  
  addWindow(window) {
    this.setState({windows: [...this.state.windows, window]});    
  }

  removeWindow(window) {
    let windows = [...this.state.windows];
    windows.splice(windows.indexOf(window), 1);
    this.setState({windows});
  }
}
