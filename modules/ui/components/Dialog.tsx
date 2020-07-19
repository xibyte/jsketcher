import React from "react";
import Window, {WindowProps} from "ui/components/Window";
import cx from 'classnames';
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";

export function Dialog({children, className, onOK, ...props}: WindowProps & {
  onOK: () => void
}) {

  return <Window className={cx(className, 'dialog')}
                 footer={
                   <ButtonGroup className='dialog-buttons padded'>
                     <Button onClick={props.onClose}>Cancel</Button>
                     <Button type='accent' onClick={onOK}>OK</Button>
                   </ButtonGroup>
                 }
                 {...props} >

    <div className='dialog-content padded'>
      {children}
    </div>

  </Window>
}