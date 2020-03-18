import React, {useContext, useEffect} from 'react';
import ls from './ConstraintExplorer.less';
import Fa from 'ui/components/Fa';
import {useStream} from "ui/effects";
import {SketcherAppContext} from "./SketcherApp";
import cx from 'classnames';
import {editConstraint} from "./ConstraintEditor";
import {NoIcon} from "../icons/NoIcon";


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
  const generators = useStream(ctx => ctx.viewer.parametricManager.$generators);

  let i = 0;

  return <React.Fragment>
    {constraints.map((c) => {
      if (c.internal) {
        return null;
      }
      i ++;
      return <ConstraintButton prefix={i+'.'} constraint={c} key={c.id}/>
    })}
    <div className={ls.titleBar}>Generators</div>
    {generators.map((c) => {
      i ++;
      return <GeneratorButton prefix={i+'.'} generator={c} key={c.id}/>
    })}

  </React.Fragment>
}

export function ConstraintButton({prefix='', constraint: c, ...props}) {

  const {viewer, ui} = useContext(SketcherAppContext);

  const edit = (constraint) => {
    if (constraint.editable) {
      editConstraint(ui.$constraintEditRequest, constraint, () => {
        viewer.parametricManager.revalidateConstraint(c);
        viewer.parametricManager.invalidate();
      });
    }
  };

  const remove = constr => {
    viewer.parametricManager.remove(constr);
    viewer.refresh();
  };

  const highlight = constr => {
    viewer.capture('highlight', constr.objects, true);
    viewer.refresh();
  };

  const withdraw = () => {
    viewer.withdrawAll('highlight');
    viewer.refresh();
  };

  useEffect(() => withdraw, [c]);

  const conflicting = c.stage.algNumSystem.conflicting.has(c);
  const redundant = c.stage.algNumSystem.redundant.has(c);

  const Icon = c.schema.icon || NoIcon;

  return <div key={c.id} className={cx(ls.objectItem, conflicting&&ls.conflicting, redundant&&ls.redundant)}
              onClick={() => c.schema.constants && edit(c)}
              onMouseEnter={() => highlight(c)}
              onMouseLeave={() => withdraw(c)}
              {...props}>
    <span className={ls.objectIcon}><Icon size={16} /></span>
    <span className={ls.objectTag}>
        {prefix} {c.schema.name}
      </span>
    <span className={ls.removeButton} onClick={() => remove(c)}><Fa icon='times'/></span>

  </div>

}

export function GeneratorButton({prefix='', generator: c, ...props}) {

  const {viewer, ui} = useContext(SketcherAppContext);

  const edit = (generator) => {
  };

  const remove = generator => {
    viewer.parametricManager.removeGenerator(c);
  };

  const highlight = generator => {
  };

  const withdraw = () => {
    viewer.withdrawAll('highlight');
    viewer.refresh();
  };

  const Icon = c.schema.icon || NoIcon;

  useEffect(() => withdraw, [c]);

  return <div key={c.id} className={cx(ls.objectItem)}
              onClick={() => edit(c)}
              onMouseEnter={() => highlight(c)}
              onMouseLeave={() => withdraw(c)}
              {...props}>
    <span className={ls.objectIcon}><Icon size={16} /></span>
    <span className={ls.objectTag}>
        {prefix} {c.schema.title}
      </span>
    <span className={ls.removeButton} onClick={() => remove(c)}><Fa icon='times'/></span>

  </div>

}