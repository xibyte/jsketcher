import React from 'react';
import ls from './HistoryTimeline.less';
import connect from 'ui/connect';
import decoratorChain from '../../../../../modules/ui/decoratorChain';
import {finishHistoryEditing, removeAndDropDependants} from '../craftHistoryUtils';
import mapContext from '../../../../../modules/ui/mapContext';
import ImgIcon from 'ui/components/ImgIcon';
import cx from 'classnames';
import Fa from '../../../../../modules/ui/components/Fa';
import {menuAboveElementHint} from '../../dom/menu/menuUtils';
import {combine} from 'lstream';
import {EMPTY_OBJECT} from '../../../../../modules/gems/objects';
import {aboveElement} from '../../../../../modules/ui/positionUtils';

@connect(streams => combine(streams.craft.modifications, streams.operation.registry, streams.wizard.insertOperation)
  .map(([modifications, operationRegistry, insertOperationReq]) => ({
    ...modifications,
    operationRegistry,
    inProgressOperation: insertOperationReq.type,
    getOperation: type => operationRegistry[type]||EMPTY_OBJECT
  })))
@mapContext(({streams}) => ({
  remove: atIndex => streams.craft.modifications.update(modifications => removeAndDropDependants(modifications, atIndex)),
  cancel: () => streams.craft.modifications.update(modifications => finishHistoryEditing(modifications)),
  setHistoryPointer: pointer => streams.craft.modifications.update(({history}) => ({history, pointer}))
}))
export default class HistoryTimeline extends React.Component {

  render() {
    let {history, pointer, setHistoryPointer, remove, getOperation, inProgressOperation} = this.props;
    let scrolly;
    let eof = history.length-1;
    return <div className={ls.root} ref={this.keepRef}>
      <Controls pointer={pointer} eoh={eof} setHistoryPointer={this.setHistoryPointerAndRequestScroll}/>
      <div className={ls.scroller} onClick={e => scrolly.scrollLeft -= 60}><Fa icon='caret-left'/></div>
      <div className={ls.history} ref={el => scrolly = el}>
        {history.map((m, i) => <React.Fragment key={i}>
          <Timesplitter active={i-1 === pointer} onClick={() => setHistoryPointer(i-1)} />
          {
            inProgressOperation && i-1 === pointer && <FutureItem appearance={getOperation(inProgressOperation).appearance}/>      
          }
          <HistoryItem index={i} modification={m} getOperation={getOperation}
                       disabled={pointer < i}
                       inProgress={!inProgressOperation && pointer === i-1} />
        </React.Fragment>)}
        <Timesplitter eoh active={eof === pointer} onClick={() => setHistoryPointer(eof)}/>
        {inProgressOperation && eof === pointer && <FutureItem appearance={getOperation(inProgressOperation).appearance}/>}
      </div>
      <div className={ls.scroller} onClick={e => scrolly.scrollLeft += 60}><Fa icon='caret-right'/></div>
      <AddButton />
    </div>;
  }
  
  // scrollInProgressToVisibleRequest = false;

  setHistoryPointerAndRequestScroll = (pointer) => {
    // this.scrollInProgressToVisibleRequest = true;
    this.props.setHistoryPointer(pointer);
  };

  keepRef = el => this.el = el;

  componentDidUpdate() {
    // this.scrollInProgressToVisibleRequest = false;
    setTimeout(() => {
      let item = this.el.querySelector(`.${ls.history} .${ls.inProgress}`);
      if (item) {
        item.scrollIntoView({behavior: "smooth", inline: "center",  block: "end"});
      } else {
        let history = this.el.querySelector(`.${ls.history}`);
        history.scrollLeft = history.scrollWidth; 
      }
    })
  }
}


function FutureItem({appearance}) {
  return <div className={cx(ls.futureItem, ls.inProgress)}>
    <ImgIcon url={appearance&&appearance.icon96} size={24} />
  </div>;

}

function Timesplitter({active, eoh, onClick}) {
  
  return <div className={cx(ls.timesplitter, active&&ls.active, eoh&&ls.eoh)} >
    <div className={ls.handle} onClick={onClick}>
      <Handle />
    </div>
  </div>;
}

function Handle() {
  const w = 12;
  const h = 15;
  const m = Math.round(w * 0.5);
  const t = Math.round(h * 0.5);
  return <svg xmlns="http://www.w3.org/2000/svg" height={h} width={w} >
    <polygon className={ls.handlePoly} points={`0,0 ${w},0 ${w},${t} ${m},${h} 0,${t}`}
             style={{strokeWidth:0.5}} />
  </svg>;
}

function Controls({pointer, eoh, setHistoryPointer}) {
  const noB = pointer===-1;
  const noF = pointer===eoh;
  return <React.Fragment>
    <div className={cx(ls.controlBtn, noB&&ls.disabled)} onClick={noB?undefined :() => setHistoryPointer(pointer-1)}>
      <Fa icon='step-backward' fw/>
    </div>
    <div className={cx(ls.controlBtn, noF&&ls.disabled)} onClick={noF?undefined :() => setHistoryPointer(pointer+1)}>
      <Fa icon='step-forward' fw/>
    </div>
    <div className={cx(ls.controlBtn, noF&&ls.disabled)} onClick={noF?undefined :() => setHistoryPointer(eoh)}>
      <Fa icon='fast-forward' fw/>
    </div>
  </React.Fragment>;
}

const HistoryItem = decoratorChain( 
  connect((streams, props) => streams.ui.craft.modificationSelection.map(s => ({
    selected: s.index === props.index,
  }))),
  mapContext(({streams}) => ({
  toggle: (index, modification, el) => streams.ui.craft.modificationSelection.update(s => 
    s.index === index ? EMPTY_OBJECT : {index, locationHint: aboveElement(el)})
}))
)
  (
function HistoryItem({index, pointer, modification, getOperation, toggle, selected, disabled, inProgress}) {
  let {appearance} = getOperation(modification.type);
  return <div className={cx(ls.historyItem, selected&&ls.selected, disabled&&ls.disabled, inProgress&&ls.inProgress)} 
              onClick={e => toggle(index, modification, e.currentTarget)}>
    <ImgIcon className={ls.opIcon} url={appearance&&appearance.icon96} size={24} />
    <span className={ls.opIndex}>{ index + 1 }</span>
  </div>;
});

const AddButton = mapContext(({services}) => ({
  showCraftMenu: e => services.action.run('menu.craft', menuAboveElementHint(e.currentTarget))
}))(
  function AddButton({showCraftMenu}) {
    return <div className={ls.add} onClick={showCraftMenu}>
      <Fa icon='plus' fw/>
    </div>;
  }
);


 