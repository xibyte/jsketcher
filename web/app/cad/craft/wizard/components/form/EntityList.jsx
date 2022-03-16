import React, {useContext} from 'react';
import ls from './EntityList.less';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Fa from 'ui/components/Fa';
import {attachToForm} from './Form';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {EMPTY_ARRAY, removeInPlace} from 'gems/iterables';
import {AppContext} from "cad/dom/components/AppContext";


function EntityList(props) {

  const ctx = useContext(AppContext);

  let {name, label, active, setActive, value, placeholder, readOnly, entityRenderer = e => e} = props;

  const deselect = (entityId) => {
    let {value, onChange} = props;
    if (Array.isArray(value)) {
      onChange(removeInPlace(value, entityId));
    } else {
      onChange(undefined);
    }
  };
  

  if (!Array.isArray(value)) {
    value = value ? asArray(value) : EMPTY_ARRAY;
  }
  return <Field active={active} name={name} onClick={setActive}>
    <Label>{label||camelCaseSplitToStr(name)}:</Label>
    <div>{value.length === 0 ?
      <span className={ls.emptySelection}>{placeholder || '<not selected>'}</span> :
      value.map((entity, i) => <span className={ls.entityRef} key={i}
                                     onMouseEnter={() => ctx.highlightService.highlight(entity)}
                                     onMouseLeave={() => ctx.highlightService.unHighlight(entity)}>
        {entityRenderer(entity)}
        {!readOnly && <span className={ls.rm} onClick={() => deselect(entity)}> <Fa icon='times'/></span>}
      </span>)}
    </div>
  </Field>;

}

export default attachToForm(EntityList);

function asArray(val) {
  _arr[0] = val;
  return _arr;
}

const _arr = [];

