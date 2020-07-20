import React from 'react';
import ls from './EntityList.less';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Fa from 'ui/components/Fa';
import {attachToForm} from './Form';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {EMPTY_ARRAY, removeInPlace} from 'gems/iterables';

@attachToForm
export default class EntityList extends React.Component {

  deselect = (entityId) => {
    let {value, onChange} = this.props;
    if (Array.isArray(value)) {
      onChange(removeInPlace(value, entityId));
    } else {
      onChange(undefined);
    }
  };
  
  render() {
    let {name, label, active, setActive, value, placeholder, readOnly, onEntityEnter, onEntityLeave,  entityRenderer = e => e} = this.props;
    if (!Array.isArray(value)) {
      value = value ? asArray(value) : EMPTY_ARRAY;
    }
    return <Field active={active} name={name} onClick={setActive}>
      <Label>{label||camelCaseSplitToStr(name)}:</Label> 
      <div>{value.length === 0 ? 
        <span className={ls.emptySelection}>{placeholder || '<not selected>'}</span> :
        value.map((entity, i) => <span className={ls.entityRef} key={i}
                                       onMouseEnter={() => onEntityEnter&&onEntityEnter(entity)}
                                       onMouseLeave={() => onEntityLeave&&onEntityLeave(entity)}>
          {entityRenderer(entity)}
          {!readOnly && <span className={ls.rm} onClick={() => this.deselect(entity)}> <Fa icon='times'/></span>}
        </span>)}
      </div>
    </Field>;
  }
}

function asArray(val) {
  _arr[0] = val;
  return _arr;
}

const _arr = [];

