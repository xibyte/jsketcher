import React, {useContext} from 'react';
import ls from './ConstraintExplorer.less';
import Fa from 'ui/components/Fa';
import {useStream} from "../../../../modules/ui/effects";
import {SketcherAppContext} from "./SketcherApp";
import cx from 'classnames';
import {editConstraint} from "./ConstraintEditor";
import {NOOP} from "../../../../modules/gems/func";


export function ConstraintExplorer(props) {
  return <React.Fragment>
    <div className={ls.titleBar}>Constraints</div>
    <div className={ls.scrollableArea}>
      <ConstraintList props={props} />
    </div>
  </React.Fragment>;
}

export function ConstraintList() {

  const constraints = useStream(ctx => ctx.viewer.parametricManager.$constraints);

  const {viewer, ui} = useContext(SketcherAppContext);

  const edit = (constraint) => {
    if (constraint.editable) {
      editConstraint(ui.$constraintEditRequest, constraint, NOOP);
    }
  };

  const remove = constr => {
    viewer.parametricManager.remove(constr);
    viewer.refresh();
  };

  const highlight = constr => {
    viewer.select(constr.objects, true);
    viewer.refresh();
  };

  const withdraw = constr => {
    viewer.deselectAll();
    viewer.refresh();
  };


  return constraints.map((c, i) => {
    if (c.internal) {
      return null;
    }
    const conflicting = viewer.parametricManager.algNumSystem.conflicting.has(c);
    const redundant = viewer.parametricManager.algNumSystem.redundant.has(c);

    return <div key={c.id} className={cx(ls.objectItem, conflicting&&ls.conflicting, redundant&&ls.redundant)}
         onClick={() => c.schema.constants && edit(c)}
         onMouseEnter={() => highlight(c)}
         onMouseLeave={() => withdraw(c)}>
      <span className={ls.objectIcon}><img width="15px" src='img/vec/pointOnArc.svg'/></span>
      <span className={ls.objectTag}>
        {i}. {c.schema.name}
      </span>
      <span className={ls.removeButton} onClick={() => remove(c)}><Fa icon='times'/></span>

    </div>
  })
}