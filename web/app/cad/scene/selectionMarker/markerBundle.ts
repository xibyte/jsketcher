import {OrderedMap} from 'gems/linkedMap';
import {eventStream, Stream} from 'lstream';
import {MObject} from "cad/model/mobject";

export const BundleName = "@Marker";

export interface MarkerService {
  clear();

  startSession()

  mark(id: any, color: any)

  withdraw(id: any);

  commit()

  markExclusively()

  markArrayExclusively()

  markAdding()

  isMarked()

  $markedEntities: Stream<MObject>
}

export interface MarkerBundleContext {
  markerService: MarkerService;
}

export function activate(ctx) {
  ctx.services.marker = createMarker(ctx.services.cadRegistry.find, ctx.services.viewer.requestRender);
  ctx.markerService = ctx.services.marker;
  ctx.streams.craft.models.attach(() => {
    ctx.services.marker.clear();
  });
}

function createMarker(findEntity, requestRender) {

  const markingSession = new Set();
  const marked = new OrderedMap();
  let needUpdate = false;
  let sessionInProgress = false;
  const $markedEntities = eventStream();
  
  const notify = () => $markedEntities.next(marked);
  const isMarked = id => marked.has(id);

  function doMark(id, color) {
    const mObj = findEntity(id);
    if (!mObj) {
      console.warn('no entity found to select: ' + id);
      return;
    }
    marked.set(id, mObj);
    mObj.ext.view && mObj.ext.view.mark('selection');
  }

  function doWithdraw(obj) {
    marked.delete(obj.id);
    obj.ext.view && obj.ext.view.withdraw('selection');
  }

  function withdraw(id) {
    const mObj = findEntity(id);
    if (!mObj) {
      console.warn('no entity found to deselect: ' + id);
      return;
    }
    doWithdraw(mObj);
    onUpdate();
  }

  function onUpdate() {
    requestRender();
    notify();
  }
  
  function clear() {
    if (marked.size !== 0) {
      marked.forEach(m => m.ext.view && m.ext.view.withdraw('selection'));
      marked.clear();
      onUpdate();
    }
  }

  function withdrawAllOfType(entityType) {
    marked.forEach(obj => {
      if (obj.TYPE === entityType) {
        doWithdraw(obj);
      }
    });
  }
  
  function markExclusively(entity, id, color) {
    withdrawAllOfType(entity);
    doMark(id, color);
    onUpdate();
  }

  function markArrayExclusively(entity, ids, color) {
    withdrawAllOfType(entity);
    ids.forEach(id => doMark(id, color));
    onUpdate();
  }

  function markAdding(entity, id, color) {
    if (!marked.has(id)) {
      doMark(id, color);
      onUpdate();
    }
  }


  function startSession() {
    markingSession.clear();
    sessionInProgress = true;
    needUpdate = false;
  }

  function mark(id, color) {
    if (!sessionInProgress) {
      throw 'can be called only withing a session';
    }
    markingSession.add(id);
    if (!marked.has(id)) {
      doMark(id, color);
      needUpdate = true;
    }
  }

  function commit() {
    marked.forEach((obj) => {
      if (!markingSession.has(obj.id)) {
        doWithdraw(obj);
        needUpdate = true;
      }
    });
    if (needUpdate) {
      onUpdate();
    }
    sessionInProgress = false;
    needUpdate = false;
    markingSession.clear();
  }

  return {
    clear, startSession, mark, commit, markExclusively, markArrayExclusively, markAdding, isMarked, $markedEntities,
    withdraw
  };
}

