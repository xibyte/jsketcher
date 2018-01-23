import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import 'ui/styles/init/minireset.css';
import 'ui/styles/init/main.less';
import '../../../../css/app3d-legacy.less';
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
    services: PropTypes.object
  };
}
