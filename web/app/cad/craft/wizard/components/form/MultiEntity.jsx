import React from 'react';
import {attachToForm} from './Form';
import Stack from 'ui/components/Stack';
import {FormContext} from '../form/Form';
import mapContext from 'ui/mapContext';
import PropTypes from 'prop-types';
import initializeBySchema from '../../../intializeBySchema';

@attachToForm
@mapContext(({streams}) => ({streams}))
export default class MultiEntity extends React.Component {

  constructor({initValue}) {
    super();
    this.state = {
      value: initValue
    };
  }

  selectionChanged = selection => {
    let {itemField, schema, context} = this.props;
    let value = selection.map(id => {
      let item = this.state.value.find(i => i[itemField] === id);
      if (!item) {
        item = initializeBySchema(schema, context);
        item[itemField] = id;
      }
      return item;
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
        ({onChange}) => this.state.value.map(data => {
          let subContext = {
            data,
            onChange
          };
          let {itemField} = this.props;
          let entityId = data[itemField];
          return <Stack key={entityId}>
            <div>{itemField}: {entityId}</div>
            <FormContext.Provider value={subContext}>
              {this.props.children}
            </FormContext.Provider>
          </Stack>;
        })
      }
    </FormContext.Consumer>;
  }
}

MultiEntity.propTypes = {
  itemField: PropTypes.string.isRequired,
  entity: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired
};
