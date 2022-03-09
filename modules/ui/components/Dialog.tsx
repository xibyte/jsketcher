import React from "react";
import Window, {WindowProps} from "ui/components/Window";
import cx from 'classnames';
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";

export function Dialog({children, compact, className, okText, cancelText, onOK, ...props}: WindowProps & {
  cancelText?: string,
  okText?: string,
  onOK?: () => void,
  compact?: boolean,
}) {

  return <Window compact={compact}
                 className={cx(className, 'dialog')}
                 footer={
                   <ButtonGroup className='dialog-buttons padded'>
                     {!compact && <Button onClick={props.onClose}>{cancelText || 'Cancel'}</Button>}
                     {onOK && <Button type='accent' onClick={onOK}>{okText || 'OK'}</Button>}
                   </ButtonGroup>
                 }
                 {...props} >

    <div className='dialog-content padded'>
      {children}
    </div>

  </Window>
}