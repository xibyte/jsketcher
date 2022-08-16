import React, {useContext} from 'react';
import ls from './EntityList.less';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Fa from 'ui/components/Fa';
import {attachToForm} from './Form';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';
import {EMPTY_ARRAY, removeInPlace} from 'gems/iterables';
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import produce from "immer";
import {FiEdit} from "react-icons/all";
import {MFace} from "cad/model/mface";
import {ModelIcon} from "cad/craft/ui/ModelIcon";
import {SafeLength} from "cad/craft/ui/SafeLength";


function EntityList(props) {

  const ctx = useContext(ReactApplicationContext);

  let {name, label, active, setActive, value, placeholder, readOnly, entityRenderer} = props;

  if (!entityRenderer) {
    entityRenderer = e => <SafeLength text={e} limit={20} />
  }

  const deselect = (entityId) => {
    const {value, onChange} = props;
    if (Array.isArray(value)) {
      onChange(produce(value, value => removeInPlace(value, entityId)));
    } else {
      onChange(undefined);
    }
  };
  

  if (!Array.isArray(value)) {
    value = value ? asArray(value) : EMPTY_ARRAY;
  }
  return <Field active={active} name={name} onClick={setActive}>
    <Label>{label||camelCaseSplitToStr(name)}:</Label>
    <div className={ls.container}>{value.length === 0 ?
      <span className={ls.emptySelection}>{placeholder || '<not selected>'}</span> :
      value.map((entity, i) => {
        const model = ctx.cadRegistry.find(entity);
        return <span className={ls.entityRef} key={i}
                onMouseEnter={() => ctx.highlightService.highlight(entity)}
                onMouseLeave={() => ctx.highlightService.unHighlight(entity)}>
          <span className={ls.entityLabel}>
            <EditButton model={model}/>
            <ModelIcon entityType={model?.TYPE} style={{marginRight: 3}} />

            {entityRenderer(entity)}
          </span>
            {!readOnly && <span className={ls.rm} onClick={() => deselect(entity)}> <Fa icon='times'/></span>}
        </span>
      })}
    </div>
  </Field>;

}

function EditButton({model}) {
  const ctx = useContext(ReactApplicationContext);

  if (!(model instanceof MFace)) {
    return null;
  }

  return <span onClick={() => ctx.sketcherService.sketchFace(model)} className={ls.editBtn}>
    <FiEdit/>
  </span>;
}


export default attachToForm(EntityList);

function asArray(val) {
  _arr[0] = val;
  return _arr;
}

const _arr = [];

