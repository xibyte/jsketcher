import {OrderedMap} from 'gems/linkedMap';
import {eventStream} from 'lstream';

export function activate(ctx) {
  ctx.services.marker = createMarker(ctx.services.cadRegistry.findEntity, ctx.services.viewer.requestRender);
  ctx.streams.craft.models.attach(() => {
    ctx.services.marker.clear();
  });
}

function createMarker(findEntity, requestRender) {

  let markingSession = new Set();
  let marked = new OrderedMap();
  let needUpdate = false;
  let sessionInProgress = false;
  let $markedEntities = eventStream();
  
  const notify = () => $markedEntities.next(marked);
  const isMarked = id => marked.has(id);

  function doMark(entity, id, color) {
    let mObj = findEntity(entity, id);
    if (!mObj) {
      console.warn('no entity found to highlight: ' + entity + ' ' + id);
      return;
    }
    marked.set(id, mObj);
    mObj.ext.view && mObj.ext.view.mark(color);
  }

  function doWithdraw(obj) {
    marked.delete(obj.id);
    obj.ext.view && obj.ext.view.withdraw();
  }

  function onUpdate() {
    requestRender();
    notify();
  }
  
  function clear() {
    if (marked.size !== 0) {
      marked.forEach(m => m.ext.view && m.ext.view.withdraw());
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
    doMark(entity, id, color);
    onUpdate();
  }

  function markArrayExclusively(entity, ids, color) {
    withdrawAllOfType(entity);
    ids.forEach(id => doMark(entity, id, color));
    onUpdate();
  }

  function markAdding(entity, id, color) {
    if (!marked.has(id)) {
      doMark(entity, id, color);
      onUpdate();
    }
  }


  function startSession() {
    markingSession.clear();
    sessionInProgress = true;
    needUpdate = false;
  }

  function mark(entity, id, color) {
    if (!sessionInProgress) {
      throw 'can be called only withing a session';
    }
    markingSession.add(id);
    if (!marked.has(id)) {
      doMark(entity, id, color);
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
    clear, startSession, mark, commit, markExclusively, markArrayExclusively, markAdding, isMarked, $markedEntities
  };
}

