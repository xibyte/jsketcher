import React from 'react';
import mapContext from 'ui/mapContext';
import ls from './SingleEntity.less';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Fa from 'ui/components/Fa';
import Button from 'ui/components/controls/Button';
import {attachToForm} from './Form';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import NumberControl from '../../../../../../../modules/ui/components/controls/NumberControl';

@attachToForm
@mapContext(({streams, services}) => ({
  streams,
  findEntity: services.cadRegistry.findEntity
}))
export default class SingleEntity extends React.Component {

  componentDidMount() {
    let {streams, entity, onChange, value, selectionIndex, findEntity} = this.props;
    let selection$ = streams.selection[entity];
    if (value && findEntity(entity, value)) {
      if (selectionIndex === 0) {
        selection$.next([value]);
      }
    }
    this.detacher = selection$.attach(selection => onChange(selection[selectionIndex]));
  }

  componentWillUnmount() {
    this.detacher();
  }
  
  deselect = () => {
    let {streams, entity} = this.props;
    streams.selection[entity].next([]);
  };
  
  render() {
    let {name, label, streams, selectionIndex, entity} = this.props;
    let selection = streams.selection[entity].value[selectionIndex];
    return <Field>
      <Label>{label||camelCaseSplitToStr(name)}:</Label> 
      <div>{selection ? 
        <span>{selection} <Button type='minor' onClick={this.deselect}> <Fa icon='times'/></Button></span> :
        <span className={ls.emptySelection}>{'<not selected>'}</span>}</div>
    </Field>;
  }
}

SingleEntity.defaultProps = {
  selectionIndex: 0
};