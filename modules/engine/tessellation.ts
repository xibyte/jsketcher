export type Tessellation1D<T> = T[];

export type Tessellation2DNode<T> = [T,T,T]; //just a triangle

export type Tessellation2D<T> = Tessellation2DNode<T>[];

export interface FaceTessellation {
  positions: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
}

export interface EdgeTessellation {
  positions: number[];
  normals: number[];
  uvs: number[];
}
