import EXTRUDE from './features/extrude/extrude.operation'; 
import OCC_BOTTLE from './features/occ-bottle'; 
import primitive_box from './features/primitive_box'; 
import primitive_cone from './features/primitive_cone'; 
import primitive_cylinder from './features/primitive_cylinder'; 
import primitive_sphere from './features/primitive_sphere'; 
import primitive_torus from './features/primitive_torus'; 

export default {

    workbenchId: 'modeler',
    features: [
        EXTRUDE,
        OCC_BOTTLE,
        primitive_box,
        primitive_cone,
        primitive_cylinder,
        primitive_sphere,
        primitive_torus    
    ]
}