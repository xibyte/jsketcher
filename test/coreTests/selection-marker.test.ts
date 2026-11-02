// Regression for https://github.com/xibyte/jsketcher/pull/209.
import {strict as assert} from 'node:assert';
import {activate} from '../../web/app/cad/scene/selectionMarker/markerBundle';
const calls: string[] = [];
const entities = new Map(['a','b','c'].map(id => [id, {id, TYPE:'FACE', ext:{view:{mark(){calls.push('mark:'+id)},withdraw(){calls.push('withdraw:'+id)}}}}]));
const ctx:any = {services:{cadRegistry:{find:(id:string)=>entities.get(id)},viewer:{requestRender(){}}},streams:{craft:{models:{attach(){}}}}};
activate(ctx);
const marker = ctx.services.marker;
marker.markAdding('FACE','a'); marker.markAdding('FACE','b'); marker.markAdding('FACE','c');
marker.markExclusively('FACE','c');
assert.equal(marker.isMarked('a'),false);assert.equal(marker.isMarked('b'),false);assert.equal(marker.isMarked('c'),true);
assert.deepEqual(calls.filter(x=>x.startsWith('withdraw:')).sort(), ['withdraw:a','withdraw:b','withdraw:c']);
marker.markAdding('FACE','a'); marker.markAdding('FACE','b');
marker.startSession();marker.mark('c');marker.commit();
assert.equal(marker.isMarked('a'),false);assert.equal(marker.isMarked('b'),false);assert.equal(marker.isMarked('c'),true);
console.log('PASS exclusive selection and session remove every stale mark');
