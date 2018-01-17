import React from 'react';
import PropTypes from 'prop-types';
import PlugableControlBar from './PlugableControlBar';

import ls from './View3d.less';
import ObjectExplorer from './ObjectExplorer';
import OperationHistory from './OperationHistory';
import Toolbar, {ToolbarButton} from 'ui/components/Toolbar';
import ImgIcon from 'ui/components/ImgIcon';
import Fa from 'ui/components/Fa';
import Abs from 'ui/components/Abs';
import {PlugableToolbarLeft, PlugableToolbarLeftSecondary, PlugableToolbarRight} from "./PlugableToolbar";
import MenuHolder from "../menu/MenuHolder";
import {TOKENS as MENU_TOKENS} from '../menu/menuPlugin';


import WindowSystem from 'ui/WindowSystem';
import Window from "ui/components/Window";
import Stack from "ui/components/Stack";
import Field from "ui/components/controls/Field";
import Label from "ui/components/controls/Label";
import NumberControl from "ui/components/controls/NumberControl";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";
import TextControl from './../../../../../modules/ui/components/controls/TextControl';


export default class View3d extends React.PureComponent {
  
  render() {
    return <div className={ls.root} onMouseDown={this.closeAllUpPopups}>
      <MenuHolder />
      <div className={ls.sideBar}>
        <ObjectExplorer/>
        <OperationHistory/>
      </div>
      <div className={ls.viewer} id='viewer-container'>
        {/*<div className={ls.viewer} */}
        <div>
        </div>
        <Abs left='0.8em' top='0.8em' className={ls.leftToolbarGroup}>
          <PlugableToolbarLeft />
          <PlugableToolbarLeftSecondary />
        </Abs>
        <Abs right='0.8em' top='0.8em'>
          <PlugableToolbarRight />
        </Abs>
        <PlugableControlBar />
        
        <WindowSystem />
        <Window initWidth={250} initLeft={500} title="Test">
          <Stack >
            <Field>
              <Label>Width</Label>
              <NumberControl initValue={5} onChange={val => console.log(val)}/>
            </Field>
            <Field>
              <Label>Face</Label>
              <TextControl initValue='face1' onChange={val => console.log(val)}/>
            </Field>
            <ButtonGroup>
              <Button text='Cancel' />
              <Button text='OK' type='accent' />
            </ButtonGroup>
          </Stack>
        </Window>

      </div>
    </div>
  }

  closeAllUpPopups = () => {
    let openedMenus = this.context.bus.state[MENU_TOKENS.OPENED];
    if (openedMenus && openedMenus.length !== 0) {
      this.context.bus.dispatch(MENU_TOKENS.CLOSE_ALL);
    }

  };
  
  getChildContext() {
    return {
      closeAllUpPopups: this.closeAllUpPopups
    }
  }
  
  static contextTypes = {
    bus: PropTypes.object
  };

  static childContextTypes = {
    closeAllUpPopups: PropTypes.func
  };
}