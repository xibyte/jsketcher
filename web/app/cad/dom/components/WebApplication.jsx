import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import 'ui/styles/init/index.less';
import AppTabs from "./AppTabs";


export default class WebApplication extends React.Component {

  constructor({appContext}) {
    super();
    this.appContext = appContext;
  }

  
  render() {
    return <AppTabs />
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
