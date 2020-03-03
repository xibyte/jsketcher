import React, {useEffect, useState} from 'react';
import Widget from "ui/components/Widget";
import NumberControl from "ui/components/controls/NumberControl";
import Stack from "ui/components/Stack";
import ButtonGroup from "ui/components/controls/ButtonGroup";
import Button from "ui/components/controls/Button";
import {useStream} from "../../../../modules/ui/effects";

export function ConstraintEditor() {

  const req = useStream(ctx => ctx.ui.$constraintEditRequest);

  const [values, setValues] = useState(null);

  useEffect(() => setValues(req && {...req.constraint.constants}), [req]);

  const setValue = (name, value) => {
    setValues({...value, [name]: value});
  };

  if (!req || !values) {
    return null;
  }

  const {constraint, onCancel, onApply} = req;

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
              return <NumberControl value={val} onChange={value => setValue(name, value)}/>
            } else {
              return <span>{val}</span>;
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

export function editConstraint(rqStream, constraint, onApply) {
  rqStream.next({
    constraint,
    onCancel: () => rqStream.next(null),
    onApply: () => {
      rqStream.next(null);
      onApply();
    }
  });
}