import React, {Fragment} from 'react';
import ls from './Expressions.less';
import cmn from 'ui/styles/common.less';
import ToolButton from 'ui/components/ToolButton';
import Fa from 'ui/components/Fa';
import Row from 'ui/components/Row';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import bind from 'ui/bind';
import cx from 'classnames';
import {actionDecorator} from '../actions/actionDecorators';
import {combine} from 'lstream';
import Folder from 'ui/components/Folder';
import Stack from '../../../../modules/ui/components/Stack';

@connect(streams => combine(streams.expressions.synced, streams.expressions.errors)
  .map(([synced, errors])=> ({synced, errors})))
@mapContext(ctx => ({
  reevaluateExpressions: ctx.services.expressions.reevaluateExpressions
}))
export default class Expressions extends React.Component {
  
  state = {
    activeTab: 'Script'
  };
  
  render() {
    
    let {errors, synced, table, reevaluateExpressions} = this.props;
    
    const tabBtn = (name, icon) => {
      return <ToolButton onClick={() => this.setState({activeTab: name})} pressed={this.state.activeTab === name}>{icon} {name}</ToolButton>; 
    };
    
    return <div className={ls.root}>
      <Row className={ls.switcher}>
        {tabBtn('Script', <Fa fw icon='pencil' />)}
        {tabBtn('Table', <Fa fw icon='table' />)}
        {errors.length > 0 && <span><Fa icon='warning' className={cx(cmn.dangerColor, cmn.inlineBlock)} /></span>}
        {!synced && <ReevaluateActionButton type='accent' className={cmn.floatRight}><Fa fw icon='check'/></ReevaluateActionButton>}
      </Row>
      
      <div className={ls.workingArea}>

        {this.state.activeTab === 'Script' && <Script reevaluateExpressions={reevaluateExpressions}/>}

        {this.state.activeTab === 'Table' && <VarTable table={table} errors={errors}/>}

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
}

const ReevaluateActionButton = actionDecorator('expressionsUpdateTable')(ToolButton);

const Script = bind(streams => streams.expressions.script)(
  function Script({value, onChange, reevaluateExpressions}) {
    return <textarea placeholder='for example: A = 50'
                     className={ls.script}
                     value={value}
                     onChange={e => onChange(e.target.value)}
                     onBlur={e => reevaluateExpressions(e.target.value)} />
  }
);

const VarTable = bind(streams => streams.expressions.list)(
  function VarTable({value}) {
    return <table className={cx(cmn.fullWidth, cmn.stripedTable, cmn.delineatedTable)}>
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