import React, {useEffect, useRef, useState} from 'react';


import 'ui/styles/global/index.less';
import '../../../css/app.less'

import {Constraints} from 'sketcher/parametric'

import {loadUIState, saveUIState} from "sketcher/uiState";
import {createElement} from "utils/domUtils";
import {SKETCHER_STORAGE_PREFIX} from "sketcher/project";
import {Dock, dockBtn} from "sketcher/components/Dock";
import {DIRECTIONS, ResizeHelper} from "ui/components/Window";
import {getSketcherAction} from "sketcher/actions";
import {initShortkeys} from "sketcher/shortkeys";
import {createAppContext} from "sketcher/sketcherContext";
import {SketcherApp} from "sketcher/components/SketcherApp";

function initializeSketcherApplication() {

  const context = createAppContext();
  const dock = initNonReactUIParts(context);
  initShortkeys(context);

  const sketchId = context.project.getSketchId();
  if (sketchId === SKETCHER_STORAGE_PREFIX + '__sample2D__') {
    // var sample = '{"layers":[{"name":"_dim","style":{"lineWidth":1,"strokeStyle":"#bcffc1","fillStyle":"#00FF00"},"data":[{"id":0,"_class":"TCAD.TWO.DiameterDimension","obj":90},{"id":1,"_class":"TCAD.TWO.DiameterDimension","obj":95},{"id":2,"_class":"TCAD.TWO.DiameterDimension","obj":42},{"id":3,"_class":"TCAD.TWO.Dimension","a":5,"b":8,"flip":false},{"id":4,"_class":"TCAD.TWO.DiameterDimension","obj":105}]},{"name":"sketch","style":{"lineWidth":2,"strokeStyle":"#ffffff","fillStyle":"#000000"},"data":[{"id":11,"_class":"TCAD.TWO.Segment","points":[[5,[6,110.1295615870824],[7,313.66509156975803]],[8,[9,419.44198895058975],[10,516.7065215258621]]]},{"id":18,"_class":"TCAD.TWO.Segment","points":[[12,[13,489.1218947877601],[14,477.98601743930897]],[15,[16,481.90945628911174],[17,182.9391540301952]]]},{"id":25,"_class":"TCAD.TWO.Segment","points":[[19,[20,427.6872468325118],[21,163.96220645927505]],[22,[23,349.9023145352797],[24,256.7344291384989]]]},{"id":32,"_class":"TCAD.TWO.Segment","points":[[26,[27,306.81261277555075],[28,273.1404656521002]],[29,[30,135.09050734792822],[31,247.98348666778958]]]},{"id":42,"_class":"TCAD.TWO.Arc","points":[[33,[34,489.1218947877601],[35,477.98601743930897]],[36,[37,419.44198895058975],[38,516.7065215258621]],[39,[40,444.1353623657045],[41,479.08688157090376]]]},{"id":53,"_class":"TCAD.TWO.Arc","points":[[44,[45,427.6872468325118],[46,163.96220645927505]],[47,[48,481.90945628911174],[49,182.9391540301952]],[50,[51,451.2148840882273],[52,183.68960424767275]]]},{"id":64,"_class":"TCAD.TWO.Arc","points":[[55,[56,349.9023145352797],[57,256.7344291384989]],[58,[59,306.81261277555075],[60,273.1404656521002]],[61,[62,313.6665992835383],[63,226.35256652594512]]]},{"id":75,"_class":"TCAD.TWO.Arc","points":[[66,[67,110.1295615870824],[68,313.66509156975803]],[69,[70,135.09050734792822],[71,247.98348666778958]],[72,[73,129.8749213918784],[74,283.58516027516237]]]},{"id":80,"_class":"TCAD.TWO.Circle","c":[77,[78,444.1353623657045],[79,479.08688157090376]],"r":17},{"id":85,"_class":"TCAD.TWO.Circle","c":[82,[83,451.2148840882273],[84,183.68960424767275]],"r":17},{"id":90,"_class":"TCAD.TWO.Circle","c":[87,[88,129.8749213918784],[89,283.58516027516237]],"r":17},{"id":95,"_class":"TCAD.TWO.Circle","c":[92,[93,364.7627927122075],[94,358.27520724354514]],"r":50},{"id":100,"_class":"TCAD.TWO.Circle","c":[97,[98,450.6425914465028],[99,356.1758703461729]],"r":13},{"id":105,"_class":"TCAD.TWO.Circle","c":[102,[103,281.1241663120215],[104,360.3197585470608]],"r":13}]},{"name":"_construction_","style":{"lineWidth":1,"strokeStyle":"#aaaaaa","fillStyle":"#000000"},"data":[{"id":113,"_class":"TCAD.TWO.Segment","points":[[107,[108,366.96497096679207],[109,448.36204633886825]],[110,[111,362.6842565514955],[112,273.2463262825022]]]},{"id":120,"_class":"TCAD.TWO.Segment","points":[[114,[115,254.60331148100178],[116,360.9680624545806]],[117,[118,474.9222739434132],[119,355.5823520325097]]]}]}],"constraints":[["Tangent",[42,18]],["Tangent",[42,11]],["coi",[33,12]],["coi",[36,8]],["Tangent",[53,25]],["Tangent",[53,18]],["coi",[44,19]],["coi",[47,15]],["Tangent",[64,25]],["Tangent",[64,32]],["coi",[55,22]],["coi",[58,26]],["Tangent",[75,11]],["Tangent",[75,32]],["coi",[66,5]],["coi",[69,29]],["coi",[77,39]],["coi",[82,50]],["coi",[87,72]],["RR",[80,85]],["RR",[85,90]],["parallel",[113,18]],["perpendicular",[120,113]],["Symmetry",[92,120]],["PointOnLine",[92,113]],["PointOnLine",[102,120]],["PointOnLine",[97,120]],["RR",[105,100]]]}';
    // localStorage.setItem(sketchId, sample);
  }
  context.project.loadFromLocalStorage();
  context.viewer.fit();


  const constraintsView = dock.views['Constraints'];
  constraintsView.node.append(createElement("div", "constraint-list"));
  dock.views['Properties'].node.append(createElement("div", "properties-view"));
  dock.views['Dimensions'].node.append(createElement("div", "dimension-view"));

  loadUIState(dock);

  window.addEventListener("beforeunload", () => {
    saveUIState(dock);
  });

  return context;
}

function initNonReactUIParts(context) {

  const AppDockViews = [
    {
      name: 'Dimensions',
      icon: 'arrows-v'
    },
    {
      name: 'Properties',
      icon: 'sliders'
    },
    {
      name: 'Constraints',
      icon: 'cogs'
    }
  ];

  //Keep all legacy UI artifacts here.

  const dockEl = document.getElementById('dock');
  const bottomButtonGroup = document.querySelector('#status .button-group');
  const dock = new Dock(dockEl, bottomButtonGroup, AppDockViews);
  dock.show('Constraints');

  const resizeHelper = new ResizeHelper(true);
  resizeHelper.registerResize(dockEl, DIRECTIONS.EAST, 5, () => document.body.dispatchEvent(new Event('layout')));

  document.body.addEventListener('layout', context.viewer.onWindowResize);

  const consoleBtn = dockBtn('Commands', 'list');
  bottomButtonGroup.appendChild(consoleBtn);

  consoleBtn.addEventListener('click', () => {
    getSketcherAction('ToggleTerminal').invoke(context);
  });
  context.ui.$showTerminalRequest.attach(show => {
    if (show) {
      consoleBtn.classList.add('selected');
    } else {
      consoleBtn.classList.remove('selected');
    }
  });

  const coordInfo = document.querySelector('.coordinates-info');
  context.viewer.canvas.addEventListener('mousemove', e => {
    const coord = context.viewer.screenToModel(e);
    coordInfo.innerText = context.viewer.roundToPrecision(coord.x) + " : " + context.viewer.roundToPrecision(coord.y);
  });

  atatchToToolStreams(context);
  return dock;
}

function atatchToToolStreams(context) {

  context.viewer.streams.tool.$change.attach(tool => {
    document.querySelectorAll('.tool-info').forEach(e => e.innerText = tool.name);
    document.querySelectorAll('.tool-hint').forEach(e => e.innerText = '');
  });
  context.viewer.streams.tool.$change.attach(tool => {
    document.querySelectorAll('.tool-info').forEach(e => e.innerText = tool.name);
    document.querySelectorAll('.tool-hint').forEach(e => e.innerText = '');
  });

  context.viewer.streams.tool.$message.attach((message) => {
    context.printToTerminal(message);
  });
  context.viewer.streams.tool.$hint.attach((message) => {
    context.printToTerminal(message);
    document.querySelectorAll('.tool-hint').forEach(e => e.innerText = message);
  });
}


export function EmbeddedSketcher() {
  const [context, setContext] = useState(null);
  const node = useRef();
  useEffect(() => {

    if (node.current) {
      setContext(initializeSketcherApplication());
    }

  }, [node.current])

  return <div style={{width: '100%', height: '100%'}} ref={node}>
    <a id="downloader" style={{display: 'none'}}></a>
    <div className="panel b-bot" style={{width: '100%', display: 'flex', justifyContent: 'space-between'}}>
      <span className="logo" style={{float:'left'}}>sketcher <sup> 2D</sup></span>
      <div style={{display: 'flex'}} id="top-toolbar"></div>
    </div>
    <div style={{width: '100%', height: 'calc(100% - 65px)', display: 'flex'}}>

      <div id="dock" className="panel b-right scroll" style={{width: 245, height: '100%', flexShrink: 0}}></div>
      <div id="viewer-container"
           style={{background: '#808080', overflow: 'hidden', height: '100%', position: 'relative', flexGrow: 1}}>
        <div id="react-controls"></div>
        <div className="tool-hint" style={{position: 'absolute', bottom: 5, right: 5}}></div>
        <canvas width="300" height="300" id="viewer"></canvas>
      </div>
      <div id="right-toolbar" className="panel b-left scroll" style={{height: '100%', flexShrink: 0}}></div>

    </div>

    <div id="status" className="panel b-top" style={{width: '100%', height:'22px'}}>
      <div className="button-group" style={{float: 'left'}}>
      </div>
      <div className="status-item coordinates-info">0.000:0.000</div>
      <div className="status-item tool-info"></div>
    </div>

    <div style={{width: 0, height: 0}} id="global-windows">
    </div>


    <div id="commands" className="win" style={{display: 'none', height: 200, width: 700}}>
      <div className="tool-caption">COMMANDS</div>
      <div className="content panel" style={{padding: 0}}>
        <div className='terminal-output-area scroll'>
          <div className='terminal-pusher'></div>
          <div className='terminal-output'></div>
        </div>
        <div className='terminal-input'>
          <input type="text" placeholder="(type a command)"/>
        </div>
      </div>
    </div>

    <div id="constrFilter" className="win" style={{display: 'none', height: 300, width:170}}>
      <div className="tool-caption">CONSTRAINT&nbsp;FILTER</div>
      <div className="content panel scroll" style={{padding: 0}}>
      </div>
    </div>
    {context && <SketcherApp applicationContext={context} /> }
  </div>
}
