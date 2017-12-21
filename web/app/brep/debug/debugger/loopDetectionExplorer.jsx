import React from 'react';
import Section from "./section";
import {
  ActiveLabel, Controls, getEdgeViewObjects, getFaceViewObjects, getInitColor, getLoopViewObjects, getVertexViewObjects,
  mapIterable,
  setViewObjectsColor,
  TAB
} from "./utils";
import {EdgesExplorer} from "./shellExplorer";
import {YELLOW} from "./colors";

export default class LoopDetectionExplorer extends React.PureComponent {

  constructor() {
    super();
    this.state = {
      step: -1
    }
  }
  
  render() {
    let {loopDetection: {id, graph, steps}, group3d} = this.props;

    let step = steps[this.state.step];
    let content;
    if (!step) {
      content = null;
    } else {
      
    }

    const stepNext = () => {
      let nextStepIdx = this.state.step + 1;
      let nextStep = steps[nextStepIdx];
      if (nextStep) {

        switch (nextStep.type) {
          case 'TRY_EDGE': {
            setViewObjectsColor(getGraphViewObjects, group3d, 'loop-detection', graph, o => getInitColor('loop-detection', 'HalfEdge'))
            setViewObjectsColor(getEdgeViewObjects, group3d, 'loop-detection', nextStep.edge, () => YELLOW)
          }
        }
        this.setState({step: nextStepIdx});
      }
    };

    const stepBack = () => {

    };

    let ctrlProps = {
      viewObjectsProvider: getGraphViewObjects, topoObj: graph, group3d, category: 'loop-detection'
    };
    let controls = <span>
        <Controls {...ctrlProps} />
        <span className='clickable' onClick={null}><i className='fa fa-fw fa-caret-square-o-left' /> back</span>
        <span className='clickable' onClick={stepNext}><i className='fa fa-fw fa-caret-square-o-right' /> next</span>
        <i> step: <b>{this.state.step}</b></i>
      </span>;

    let name = <ActiveLabel {...ctrlProps}>loop detection {id}</ActiveLabel>;

    return <Section name={name} closable defaultClosed={true} controls={controls}>

      <GraphExplorer {...{graph, group3d}} />
    </Section>
    ;
  }
}


export function GraphExplorer({graph, group3d}) {
  let ctrlProps = {
    viewObjectsProvider: getGraphViewObjects, topoObj: graph, group3d, category: 'default'
  };
  let controls = <Controls {...ctrlProps} />;
  let name = <ActiveLabel {...ctrlProps}>graph</ActiveLabel>;

  return <Section name={name} tabs={TAB} closable defaultClosed={true} controls={controls}>
    {mapIterable(graph, edge => <EdgesExplorer key={edge.refId} {...{edge, group3d}} category='default'/>)}
  </Section>
}

function getGraphViewObjects(group3d, category, out, graph) {
  graph.forEach(getEdgeViewObjects.bind(null, group3d, category, out));
}
