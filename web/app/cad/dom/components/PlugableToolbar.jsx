import React, {Fragment} from 'react';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import {TOKENS as UI_TOKENS} from '../uiEntryPointsPlugin';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import Toolbar, {ToolbarButton} from "../../../../../modules/ui/components/Toolbar";
import ImgIcon from "../../../../../modules/ui/components/ImgIcon";
import {toIdAndOverrides} from "../../actions/actionRef";
import {capitalize} from "../../ui/utils";


function ConfigurableToolbar({actions, small, ...props}) {

  return <Toolbar small={small}>
    {actions.map(actionRef => {
      let [id, overrides] = toIdAndOverrides(actionRef);
      let Comp = connect(
        ActionButton,
        [ACTION_TOKENS.actionAppearance(id), ACTION_TOKENS.actionState(id)], {
          staticProps: {small}, 
          mapProps: ([appearance, state]) => Object.assign({}, appearance, state, overrides)
        });
      return <Comp key={id}/>
    })}
  </Toolbar>
}

function ActionButton({label, icon96, cssIcons, small, enabled, visible, onClick}) {
  if (!visible) {
    return null;
  }

  let icon = small ? <Fa fa={cssIcons} fw /> : <ImgIcon url={icon96} size={48} />; 
    
  return <ToolbarButton {...{onClick, disabled: !enabled}}>
    {icon}
    {!small && <div>{capitalize(label)}</div>}
  </ToolbarButton>
}

export function createPlugableToolbar(configToken, small) {
  return connect(ConfigurableToolbar, configToken, {
    staticProps: {small}, 
    mapProps: ([actions]) => ({actions}) 
  });
}

export const PlugableToolbarLeft = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_LEFT);
export const PlugableToolbarLeftSecondary = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_LEFT_SECONDARY);
export const PlugableToolbarRight = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_RIGHT, true);