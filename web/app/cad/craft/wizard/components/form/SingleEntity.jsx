import React from 'react';
import mapContext from 'ui/mapContext';
import ls from './SingleEntity.less';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Fa from 'ui/components/Fa';
import Button from 'ui/components/controls/Button';
import {attachToForm} from './Form';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';

@attachToForm
@mapContext(({streams, services}) => ({
  streams,
  findEntity: services.cadRegistry.findEntity
}))
export default class SingleEntity extends React.Component {

  componentDidMount() {
    let {streams, entity, onChange, value, findEntity} = this.props;
    let selection$ = streams.selection[entity];
    if (findEntity(entity, value)) {
      selection$.next([value]);
    }
    this.detacher = selection$.attach(selection => onChange(selection[0]));
  }

  componentWillUnmount() {
    this.detacher();
  }
  
  deselect = () => {
    let {streams, entity} = this.props;
    streams.selection[entity].next([]);
  };
  
  render() {
    let {name, label, streams, entity} = this.props;
    let selection = streams.selection[entity].value[0];
    return <Field>
      <Label>{label||camelCaseSplitToStr(name)}:</Label> 
      <div>{selection ? 
        <span>{selection} <Button type='minor' onClick={this.deselect}> <Fa icon='times'/></Button></span> :
        <span className={ls.emptySelection}>{'<not selected>'}</span>}</div>
    </Field>;
  }
}
