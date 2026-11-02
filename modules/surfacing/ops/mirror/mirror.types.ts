import type {Vec3} from 'math/vec';
import type {NurbsSurface} from '../../models/NurbsSurface/NurbsSurface.entity';
import type {Vertex} from '../../models/Vertex/Vertex.entity';

/**
 * A mirror constraint lives in `scene.globalConstraints.mirror`. The
 * scene's `addMirrorConstraint` / `removeMirrorConstraint` methods own
 * the subscription lifecycle — the op layer just constructs the data
 * and hands it in.
 */
export interface MirrorConstraint {
  source: NurbsSurface;
  mirror: NurbsSurface;
  planePoint: Vec3;
  planeNormal: Vec3;
  cpPairs: {source: Vertex, mirror: Vertex}[];
  /** Detach this constraint's cp-change listener. */
  unsubscribe?: () => void;
}
