import {createBoundingSurfaceFrom2DPoints} from 'brep/brep-builder';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {BrepSurface} from 'geom/surfaces/brepSurface';

export class SurfacePrototype {
  
  boundTo(points2dOnSurface, minWidth, minHeight, offset) {
    throw 'abstract';
  }
  
}

export class PlaneSurfacePrototype extends SurfacePrototype {

  constructor(plane) {
    super();
    this.plane = plane;
  }
  
  boundTo(points2dOnSurface, minWidth, minHeight, offset) {
    return createBoundingSurfaceFrom2DPoints(points2dOnSurface, this.plane, minWidth, minHeight, offset);        
  }
}

/*
 * The only difference PlaneSurfacePrototype is show phony surface 
 * when no sketching from csys origin for estetic purposes. 
 * When sketch exists behaves like PlaneSurfacePrototype using csys transformation though
 */
export class CSysPlaneSurfacePrototype extends SurfacePrototype {

  constructor(csys) {
    super();
    this.csys = csys;
    this.plane = {
      get3DTransformation: () => this.csys.outTransformation 
    }
  }

  boundTo(points2dOnSurface, minWidth, minHeight, offset) {
    
    if (points2dOnSurface.length === 0) {
      let dx = this.csys.x.multiply(minWidth);
      let dy = this.csys.y.multiply(minHeight);
      let origin = this.csys.origin;
      return new BrepSurface(new NurbsSurface(verb.geom.NurbsSurface.byKnotsControlPointsWeights( 1, 1, [0,0,1,1], [0,0,1,1],
        [ [ origin.plus(dy).data(), origin.plus(dx)._plus(dy).data()] ,
          [ origin.data(),          origin.plus(dx ).data() ] ] )));

    }
    
    return createBoundingSurfaceFrom2DPoints(points2dOnSurface, this.plane, minWidth, minHeight, offset);
  }
}