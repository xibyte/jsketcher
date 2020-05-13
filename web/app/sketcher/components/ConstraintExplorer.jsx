import React, {useContext, useEffect} from 'react';
import ls from './ConstraintExplorer.less';
import Fa from 'ui/components/Fa';
import {useStream} from "ui/effects";
import cx from 'classnames';
import {editConstraint} from "./ConstraintEditor";
import {NoIcon} from "../icons/NoIcon";
import {SketcherAppContext} from "./SketcherAppContext";
import {StageControl} from "./StageControl";
import {Scope} from "./Scope";

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
    <div className={ls.titleBar}>Stages</div>
    <Scope><StageControl /></Scope>

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


// function configureConstraintsFilter() {
//   var constraintsCaption = constraintsView.node.find('.tool-caption');
//   var constraintsFilterBtn = ui.faBtn("filter");
//   constraintsFilterBtn.css({'float': 'right', 'margin-right': '10px', cursor: 'pointer'});
//   constraintsCaption.append(constraintsFilterBtn);
//   var constraintsFilterWin = new ui.Window($('#constrFilter'), app.winManager);
//   ui.bindOpening(constraintsFilterBtn, constraintsFilterWin);
//   var content = constraintsFilterWin.root.find('.content');
//
//   var constrTypes = [], constrType;
//   for (var cname in Constraints) {
//     c = Constraints[cname];
//     if (c.prototype !== undefined && c.prototype.UI_NAME !== undefined && !c.prototype.aux) {
//       constrTypes.push(c);
//     }
//   }
//   constrTypes.sort(function (a, b) {
//     if (a.prototype.NAME == 'coi') {
//       return b.prototype.NAME == 'coi' ? 0 : -1;
//     }
//     return a.prototype.UI_NAME.localeCompare(b.prototype.UI_NAME)
//   });
//   for (var i = 0; i < constrTypes.length; i++) {
//     var c = constrTypes[i];
//     if (c.prototype !== undefined && c.prototype.UI_NAME !== undefined && !c.prototype.aux) {
//       var checkbox = $('<input>', {type : 'checkbox', checked : 'checked', value : c.prototype.NAME});
//       content.append(
//         $('<label>', { css : {display : 'block', 'white-space' : 'nowrap'}})
//           .append(checkbox)
//           .append(c.prototype.UI_NAME)
//       );
//       checkbox.change(function(){
//         var checkbox = $(this);
//         app.constraintFilter[checkbox.val()] = checkbox.is(':checked') != true;
//         constrList.refresh();
//       });
//     }
//   }
// }
// configureConstraintsFilter();