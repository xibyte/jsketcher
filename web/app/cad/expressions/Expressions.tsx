import React, {Fragment, useContext, useState} from 'react';
import ls from './Expressions.less';
import cmn from 'ui/styles/common.less';
import ToolButton from 'ui/components/ToolButton';
import Fa from 'ui/components/Fa';
import Row from 'ui/components/Row';
import bind from 'ui/bind';
import cx from 'classnames';
import {actionDecorator} from '../actions/actionDecorators';
import Folder from 'ui/components/Folder';
import Stack from 'ui/components/Stack';
import {AppContext} from "../dom/components/AppContext";
import {useStream} from "ui/effects";


export default function Expressions() {
  
  const [activeTab, setActiveTab] = useState('Script');

  const ctx = useContext(AppContext);
  const synced = useStream(ctx => ctx.expressionService.synced$);
  const errors = useStream(ctx => ctx.expressionService.errors$);
  const reevaluateExpressions = ctx.expressionService.reevaluateExpressions;


  const tabBtn = (name, icon) => {
    // @ts-ignore
    return <ToolButton type='' onClick={() => setActiveTab(name)} pressed={activeTab === name}>{icon} {name}</ToolButton>;
  };

  return <div className={ls.root}>

    <Row className={ls.switcher}>
      {tabBtn('Script', <Fa fw icon='pencil' />)}
      {tabBtn('Table', <Fa fw icon='table' />)}
      {errors.length > 0 && <span><Fa icon='warning' className={cx(cmn.dangerColor, cmn.inlineBlock)} /></span>}
      {!synced && <ReevaluateActionButton type='accent' className={cmn.floatRight}><Fa fw icon='check'/></ReevaluateActionButton>}
    </Row>

    <div className={ls.workingArea}>

      {activeTab === 'Script' && <Script reevaluateExpressions={reevaluateExpressions}/>}

      {activeTab === 'Table' && <VarTable errors={errors}/>}

      {errors.length > 0 && <Folder title={<Fragment><Fa icon='warning' className={cx(cmn.dangerColor)} /> Script Errors</Fragment>}>
        <Stack>
          {errors.map(err => <div key={err.line}>
            line {err.line + 1}: {err.message}
          </div>)}
        </Stack>
      </Folder>}

    </div>

  </div>;

}

const ReevaluateActionButton = actionDecorator('expressionsUpdateTable')(ToolButton);

const Script = bind(ctx => ctx.expressionService.script$)(
  function Script({value, onChange, reevaluateExpressions}) {
    return <textarea placeholder='for example: A = 50'
                     className={ls.script}
                     value={value}
                     onChange={e => onChange(e.target.value)}
                     onBlur={e => reevaluateExpressions(e.target.value)} />
  }
);

const VarTable = bind(ctx => ctx.expressionService.list$)(
  function VarTable({value}) {
    return <table className={cx(cmn.fullWidth, 'striped', 'delineated')}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {value.map(({name, value}, i) => <tr key={i}>
          <td>{name}</td>
          <td>{value}</td>
        </tr>)}
      </tbody>
    </table>
  }
);