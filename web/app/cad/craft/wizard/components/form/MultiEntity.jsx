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

  selectionChanged = selection => {
    let {itemField, schema, context} = this.props;
    let value = selection.map(id => {
      let item = this.props.value.find(i => i[itemField] === id);
      if (!item) {
        item = initializeBySchema(schema, context);
        item[itemField] = id;
      }
      return item;
    });
    this.props.onChange(value);
  };

  componentDidMount() {
    let {streams, entity} = this.props;
    let selection$ = streams.selection[entity];
    this.selectionChanged(selection$.value);
    this.detacher = selection$.attach(this.selectionChanged);
  }

  componentWillUnmount() {
    this.detacher();
  }

  render() {

    return <FormContext.Consumer>
      {
        ctx => this.props.value.map(data => {
          let subContext = {
            data,
            updateParam: (name, value) => {
              data[name] = value;
              ctx.updateParam(this.props.name, this.props.value);
            },
            ...ctx
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
