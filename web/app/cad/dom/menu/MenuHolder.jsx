import React from 'react';
import Menu, {MenuItem, MenuSeparator} from 'ui/components/Menu';
import Filler from 'ui/components/Filler';
import Fa from 'ui/components/Fa';
import {ActionButtonBehavior} from '../../actions/ActionButtonBehavior';
import connect from 'ui/connect';
import {combine, merger} from 'lstream';
import {useStream} from "../../../../../modules/ui/effects";

function MenuHolder({menus}) {
  return menus.map(({id, actions}) => <ConnectedActionMenu key={id} menuId={id} actions={actions} />); 
}

function ActionMenu({actions, keymap, ...menuState}) {
  return <Menu {...menuState}>
    {actions.map((action, index) => {
      if (action === '-') {
        return <MenuSeparator key={index} />
      }
      return <ConnectedMenuItem key={action} actionId={action} hotKey={keymap[action]} />;  
    })}
  </Menu>;
}

function ActionMenuItem({label, cssIcons, icon32, icon96, enabled, hotKey, visible, actionId, ...props}) {
  if (!visible) {
    return null;
  }
  let icon, style;
  if (icon32 || icon96) {
    let size = 16;
    icon = <Filler width={size} height='1.18em'/>;
    style = {
      backgroundImage: `url(${icon32 || icon96})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${size}px ${size}px`,
      backgroundPositionY: 6,
      backgroundPositionX: 5,
    };
    if (!enabled) {
      style.filter = 'grayscale(90%)';
    }
  } else if (cssIcons) {
    icon = <Fa fw fa={cssIcons} />;    
  }
  
  return <MenuItem {...{label, icon,  style, disabled: !enabled, hotKey, ...props}} />;
}

const ConnectedActionMenu = connect((streams, props) =>
  combine(
    streams.ui.menu.states[props.menuId],
    streams.ui.keymap)
    .map(([s, keymap]) => ({...s, keymap})))
(ActionMenu);

export function ConnectedMenuItem(props) {

  const actionId = props.actionId;
  const stream = useStream(ctx => combine(ctx.streams.action.appearance[actionId], ctx.streams.action.state[actionId]));
  if (!stream) {
    return null;
  }
  const [actionAppearance, actionState] = stream;

  return <ActionButtonBehavior actionId={actionId}>
    {behaviourProps => <ActionMenuItem {...behaviourProps} {...actionAppearance} {...actionState} {...props} />}
  </ActionButtonBehavior>;

}


export default connect(streams => streams.ui.menu.all.map(menus => ({menus})))(MenuHolder);



