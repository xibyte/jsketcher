import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import 'ui/styles/init/index.less';
import AppTabs from "./AppTabs";
import {StreamsContext} from "../../../../../modules/ui/streamsContext";
import {AppContext} from "./AppContext";


export default class WebApplication extends React.Component {

  constructor({appContext}) {
    super();
    this.appContext = appContext;
  }

  
  render() {
    const {appContext} = this.props;
    return <StreamsContext.Provider value={appContext}>
      <AppContext.Provider value={appContext}>
        <AppTabs />
      </AppContext.Provider>
    </StreamsContext.Provider>
  }

  getChildContext() {
    return this.appContext;
  }
  
  static childContextTypes = {
    bus: PropTypes.object,
    services: PropTypes.object,
    streams: PropTypes.object
  };
}
