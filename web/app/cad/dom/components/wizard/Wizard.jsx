import React from 'react';
import Window from 'ui/components/Window';
import Stack from 'ui/components/Stack';
import Field from 'ui/components/controls/Field';
import Label from 'ui/components/controls/Label';
import camelCaseSplit from 'gems/camelCaseSplit';
import NumberControl from 'ui/components/controls/NumberControl';
import TextControl from 'ui/components/controls/TextControl';
import Button from 'ui/components/controls/Button';
import ButtonGroup from 'ui/components/controls/ButtonGroup';

export default class Wizard extends React.Component {
  
  constructor({initialState, metadata, previewer}) {
    super();
    this.params = {};

    metadata.forEach(([name,, v]) => this.params[name] = v);
    
    Object.assign(this.params, initialState);
    
    this.preview = previewer(this.params);
  }

  shouldComponentUpdate() {
    // all controls are unmanaged and they should keep their state 
    // if the wizard manager gets updated when a new wizard appears
    return false;
  }

  render() {
    let {left, title, metadata, onOK, onCancel} = this.props;
    let onClose = () => {
      this.onClose();
      onCancel();
    };
    return <Window initWidth={250} initLeft={left} title={title} onClose={onClose}>
      <Stack >
        {metadata.map(([name, type, , params], index) => {
          return <Field key={index}>
            <Label>{uiLabel(name)}</Label>
            {this.controlForType(name, type, params)}
          </Field>
        } )}
        <ButtonGroup>
          <Button text='Cancel' onClick={onClose} />
          <Button text='OK' type='accent' onClick={() => {
            this.onClose();
            onOK(this.params);
          }} />
        </ButtonGroup>
      </Stack>
    </Window>;
  }

  onClose() {
    this.preview.dispose();
  }
  
  controlForType(name, type, params) {
    const onChange = val => {
      this.params[name] = val;
      this.preview.update(this.params);
    };
    let initValue = this.params[name];
    let commonProps = {
      onChange, initValue, ...params
    };
    if (type === 'number') {
      return <NumberControl {...commonProps} />
    } else {
      return <TextControl {...commonProps} />
    }
  }
}


function uiLabel(name) {
  return camelCaseSplit(name).map(w => w.toLowerCase()).join(' ');
}

