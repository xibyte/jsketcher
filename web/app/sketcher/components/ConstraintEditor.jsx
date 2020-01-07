import React, {useState} from 'react';
import Widget from "ui/components/Widget";
import NumberControl from "ui/components/controls/NumberControl";
import {DEG_RAD} from "../../math/math";
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";
import connect from "../../../../modules/ui/connect";


export const ConstraintEditor = connect(streams => streams.sketcherApp.constraintEditRequest)(
  function ConstraintEditor({constraint, onCancel, onApply}) {
    return <ConstraintEditorImpl constraint={constraint}
                                 onCancel={onCancel}
                                 onApply={onApply} />
  }
);

export function ConstraintEditorImpl({constraint, onCancel, onApply}) {

  if (!constraint) {
    return null;
  }

  const [values, setValues] = useState({...constraint.constants});

  const setValue = (name, value) => {
    setValues({...value, [name]: value});
  };

  const apply = () => {
    Object.keys(constraint.schema.constants).map(name => {
      const val = values[name];
      if (val !== undefined) {
        constraint.constants[name] = val;
      }
    });
    onApply();
  };

  return <Widget>

    <Stack>

      {Object.keys(constraint.schema.constants).sort().map(name => <div key={name}>

        {
          (() => {
            const def = constraint.schema.constants[name];
            const val = values[name];
            if (def.type === 'number') {
              return <NumberControl value={val} onChange={value => setValue(name, value)} />
            } else {
              return <span >{val}</span>;
            }

          })()

        }

      </div>)}


      <ButtonGroup>
        <Button onClick={onCancel}>CANCEL</Button>
        <Button type='accent' onClick={apply}>APPLY</Button>
      </ButtonGroup>

    </Stack>

  </Widget>;

}