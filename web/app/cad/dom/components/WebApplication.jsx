import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import 'ui/styles/init/minireset.css';
import 'ui/styles/init/main.less';
import '../../../../css/app3d-legacy.less';

import View3d from './View3d';

import ls from './WebApplication.less';
import TabSwitcher, {Tab} from 'ui/components/TabSwticher';
import Card from 'ui/components/Card';

const DEFAULT_VIEW = {id: 'view3d',  label: '3D View', Component: View3d};

export default class WebApplication extends React.Component {

  constructor({appContext}) {
    super();
    this.appContext = appContext;
    this.views = [DEFAULT_VIEW, {id: 'XXX',  label: '3D View2', Component: Fragment}];
    this.state = {
      activeView: DEFAULT_VIEW
    };
  }

  switchTab = (viewId) => {
     this.setState({activeView: this.views.find(v => v.id === viewId)});
  };
  
  render() {
    let activeView = this.state.activeView;
    return <div className={ls.root}>
      
      <div className={ls.content}>
        {this.views.map(({id, Component}) => <Card key={id} visible={id === activeView.id}>
          <Component />
        </Card>)}
      </div>
      
      <TabSwitcher className={ls.contentSwitcher}>
        {this.views.map(({label, id}) => <Tab id={id} label={label} active={id === activeView.id} 
                                              key={id}
                                              closable={id !== DEFAULT_VIEW} 
                                              onSwitch={this.switchTab} />)}
      </TabSwitcher> 
      <a id='downloader' style={{display: 'none'}}/>
    </div>
  }

  getChildContext() {
    return this.appContext;
  }
  
  static childContextTypes = {
    bus: PropTypes.object,
    services: PropTypes.object
  };
}

function render(Component) {
  return <Component />;
}