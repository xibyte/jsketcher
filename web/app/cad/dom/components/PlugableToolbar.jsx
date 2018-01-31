import React, {Fragment} from 'react';
import connect from 'ui/connect';
import Fa from 'ui/components/Fa';
import {TOKENS as UI_TOKENS} from '../uiEntryPointsPlugin';
import {TOKENS as ACTION_TOKENS} from '../../actions/actionSystemPlugin';
import Toolbar, {ToolbarButton} from 'ui/components/Toolbar';
import ImgIcon from 'ui/components/ImgIcon';
import {toIdAndOverrides} from '../../actions/actionRef';
import {mapActionBehavior} from '../../actions/actionButtonBehavior';
import {DEFAULT_MAPPER} from 'ui/connect';
import capitalize from 'gems/capitalize';


function ConfigurableToolbar({actions, small, ...props}) {

  return <Toolbar small={small}>
    {actions.map(actionRef => {
      let [id, overrides] = toIdAndOverrides(actionRef);
      return <ConnectedActionButton actionId={id} key={id} small={small} {...overrides} />
    })}
  </Toolbar>
}

function ActionButton({label, icon96, cssIcons, small, enabled, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }

  let icon = small ? <Fa fa={cssIcons} fw /> : <ImgIcon url={icon96} size={48} />; 
    
  return <ToolbarButton disabled={!enabled} {...props}>
    {icon}
    {!small && <div>{capitalize(label)}</div>}
  </ToolbarButton>
}

const ConnectedActionButton = connect(ActionButton,  
  ({actionId}) => [ACTION_TOKENS.actionAppearance(actionId), ACTION_TOKENS.actionState(actionId)], {
    mapProps: (state, props) => Object.assign(DEFAULT_MAPPER(state), props),
    mapActions: mapActionBehavior(props => props.actionId),
  });

export function createPlugableToolbar(configToken, small) {
  return connect(ConfigurableToolbar, configToken, {
    staticProps: {small}, 
    mapProps: ([actions]) => ({actions}) 
  });
}

export const PlugableToolbarLeft = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_LEFT);
export const PlugableToolbarLeftSecondary = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_LEFT_SECONDARY);
export const PlugableToolbarRight = createPlugableToolbar(UI_TOKENS.TOOLBAR_BAR_RIGHT, true);