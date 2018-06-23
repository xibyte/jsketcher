import React from 'react';
import PropTypes from 'prop-types';
import {attachToForm} from './Form';
import Stack from 'ui/components/Stack';
import {FormContext} from '../form/Form';
import mapContext from 'ui/mapContext';

@attachToForm
@mapContext(({streams}) => ({streams}))
class MultiEntityImpl extends React.Component {

  constructor({entity, itemName, initValue}, ) {
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
    let {streams, entity} = this.props;
    this.detacher = streams.selection[entity].attach(this.selectionChanged);
  }

  componentWillUnmount() {
    this.detacher();
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
}

export default function MultiEntity(props, {streams}) {
  let defaultValue = streams.selection[props.entity].value.map(id => ({
    [props.itemName]: id
  }));
  return <MultiEntityImpl defaultValue={defaultValue} {...props}/>
}

MultiEntity.contextTypes = {
  streams: PropTypes.object
};