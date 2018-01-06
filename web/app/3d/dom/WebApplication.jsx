import React, {Fragment} from 'react';

export default class WebApplication extends React.Component {

  render() {
    return <Fragment>
        <div className="app-tab-view" id="view-3d">
        <div style={{
          position: 'relative',
          width: '100%', 
          height: '100%'
          }}>
          <div id="right-panel"></div>
          <div id="viewer-container"></div>
          <div id="control-bar">
            <div className="left-group">
            </div>
            <div className="right-group">
            </div>
          </div>
        </div>
      </div>
      <div id="tab-switcher"></div>
      <a id="downloader" style={{display: 'none'}} ></a>
    </Fragment>
  }
}