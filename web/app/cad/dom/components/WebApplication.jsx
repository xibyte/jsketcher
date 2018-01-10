import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import 'ui/styles/init/minireset.css';
import 'ui/styles/init/main.less';
import '../../../../css/app3d-legacy.less';

import View3d from './View3d';

import WindowSystem from 'ui/WindowSystem';
import Window from "ui/components/Window";
import Folder from "ui/components/Folder";
import Field from "ui/components/controls/Field";
import Label from "ui/components/controls/Label";
import NumberControl from "ui/components/controls/NumberControl";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";

import ls from './WebApplication.less';
import TabSwitcher, {Tab} from 'ui/components/TabSwticher';
import Card from 'ui/components/Card';

const DEFAULT_VIEW = {id: 'view3d',  label: '3D View', Component: View3d};

export default class WebApplication extends React.Component {

  constructor({bus}) {
    super();
    this.bus = bus;
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
      {/*<WindowSystem />      */}
      {/*<Window initWith={250} >*/}
        {/*<Folder title="Test">*/}
          {/*<Field>*/}
            {/*<Label>Width</Label>*/}
            {/*<NumberControl initValue={5} onChange={val => console.log(val)}/>*/}
          {/*</Field>*/}
          {/*<Field>*/}
            {/*<Label>Width</Label>*/}
            {/*<NumberControl initValue={6} onChange={val => console.log(val)}/>*/}
          {/*</Field>*/}
          {/*<ButtonGroup>*/}
            {/*<Button text='Cancel' />*/}
            {/*<Button text='OK' />*/}
          {/*</ButtonGroup>*/}
        {/*</Folder>*/}
      {/*</Window>*/}
    </div>
  }

  getChildContext() {
    return {bus: this.bus};
  }
  
  static childContextTypes = {
    bus: PropTypes.object
  };
}

function render(Component) {
  return <Component />;
}