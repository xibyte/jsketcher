import {createBoundingSurfaceFrom2DPoints} from '../../brep/brep-builder';

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