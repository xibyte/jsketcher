import React from 'react';
import PropTypes from 'prop-types';
import {entitySelectionToken} from '../../../../scene/controls/pickControlPlugin';
import {attachToForm} from './Form';
import Stack from 'ui/components/Stack';
import {FormContext} from '../form/Form';

const MultiEntityImpl = attachToForm(class MultiEntityImpl extends React.Component {

  constructor({entity, itemName, initValue}, {bus}) {
    super();
    this.state = {
      value: initValue
    };
  }

  selectionChanged = selection => {
    let value = selection.map(id => {
      let item = this.state.value.find(i => i[this.props.itemName] === id);
      return item || {[this.props.itemName]: id};
    });
    this.setState({value});
    this.props.onChange(value);
  };

  componentDidMount() {
    this.context.bus.subscribe(entitySelectionToken(this.props.entity), this.selectionChanged);
  }

  componentWillUnmount() {
    this.context.bus.unsubscribe(entitySelectionToken(this.props.entity), this.selectionChanged);
  }

  render() {

    return <FormContext.Consumer>
      {
        ({onChange}) => this.state.value.map((data, i) => {
          let subContext = {
            data,
            onChange
          };
          let entityId = data[this.props.itemName];
          return <Stack key={entityId}>
            <div>{this.props.itemName}: {entityId}</div>
            <FormContext.Provider value={subContext}>
              {this.props.children}
            </FormContext.Provider>
          </Stack>;
        })
      }
    </FormContext.Consumer>;
  }

  static contextTypes = {
    bus: PropTypes.object
  };
});

export default function MultiEntity(props, {bus}) {
  let defaultValue = bus.state[entitySelectionToken(props.entity)].map(id => ({
    [props.itemName]: id
  }));
  return <MultiEntityImpl defaultValue={defaultValue} {...props}/>
}

MultiEntity.contextTypes = {
  bus: PropTypes.object
};