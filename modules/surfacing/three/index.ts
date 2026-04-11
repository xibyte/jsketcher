/**
 * Barrel file for the surfacing three-layer.
 * Import shared materials, geometries, colors, sizes, and the EntityObject3D
 * base class from here so the module's Three.js surface is discoverable in
 * one place.
 *
 *   import {EntityObject3D, createSurfaceMaterial, SURFACE_BASE_COLOR} from '../../three';
 */
export * from './colors';
export * from './sizes';
export * from './materials';
export * from './geometries';
export * from './tessellation';
export * from './EntityObject3D';
export * from './selection';
export * from './SelectionGizmoOverlay';
