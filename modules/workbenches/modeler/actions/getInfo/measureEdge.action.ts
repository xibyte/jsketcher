import {ActionDefinition} from 'cad/actions/actionSystemBundle';
import {ApplicationContext} from 'cad/context';
import {MEdge} from 'cad/model/medge';
import {TbRuler2} from 'react-icons/tb';

type Point = [number, number, number];

/** The endpoint distance is a chord, not the length of a curved edge. */
export function measureEdgeEndpoints(edge: MEdge): {start: Point; end: Point; delta: Point; distance: number} {
  const halfEdge = edge?.brepEdge?.halfEdge1;
  const a = halfEdge?.vertexA?.point;
  const b = halfEdge?.vertexB?.point;
  const location = edge?.shell?.location;
  if (!a || !b || !location || typeof location.apply3 !== 'function') {
    throw new Error('The selected edge has no usable endpoints.');
  }
  const start = location.apply3([a.x, a.y, a.z]) as Point;
  const end = location.apply3([b.x, b.y, b.z]) as Point;
  if (![...start, ...end].every(Number.isFinite)) {
    throw new Error('The selected edge has invalid coordinates.');
  }
  const delta: Point = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  const distance = Math.hypot(...delta);
  if (!Number.isFinite(distance)) throw new Error('The endpoint distance is outside the supported numeric range.');
  return {start, end, delta, distance};
}

function format(value: number): string {
  return Number(value.toPrecision(12)).toString();
}

function point(value: Point): string {
  return value.map(format).join(', ');
}

/** Uses a document-owned dialog; opening again replaces the previous instance. */
function showMeasurement(message: string): void {
  document.getElementById('codi-edge-measurement')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'codi-edge-measurement';
  dialog.setAttribute('aria-labelledby', 'codi-edge-measurement-title');
  Object.assign(dialog.style, {color:'#eee', background:'#24272b', border:'1px solid #777', borderRadius:'6px', padding:'1rem', maxWidth:'min(90vw, 36rem)', font:'inherit'});
  const title = document.createElement('h2');
  title.id = 'codi-edge-measurement-title';
  title.textContent = 'Measure edge endpoints';
  const contents = document.createElement('p');
  contents.style.whiteSpace = 'pre-wrap';
  contents.textContent = message;
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Close';
  button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove(), {once:true});
  dialog.append(title, contents, button); document.body.append(dialog);
  dialog.showModal(); button.focus();
}

export const MeasureEdgeAction: ActionDefinition = {
  id: 'MEASURE_EDGE_ENDPOINTS',
  appearance: {icon: TbRuler2, label: 'Measure edge endpoints', info: 'Show endpoint coordinates and straight-line distance.'},
  invoke: (ctx: ApplicationContext) => {
    const edges = ctx.services.selection.edge.objects;
    if (edges.length !== 1) {
      showMeasurement('Select exactly one edge, then choose this tool again.');
      return;
    }
    try {
      const result = measureEdgeEndpoints(edges[0]);
      showMeasurement(`World coordinates, in model units:\nStart: ${point(result.start)}\nEnd: ${point(result.end)}\nChange (end − start): ${point(result.delta)}\nStraight-line endpoint distance: ${format(result.distance)}\n\nFor a curved edge this is the chord distance, not the distance along the curve.`);
    } catch (error) {
      showMeasurement(error instanceof Error ? error.message : 'Could not measure this edge.');
    }
  },
};
