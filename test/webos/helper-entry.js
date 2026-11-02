import modellerUISubject from '../coreTests/subjects/modellerTPI';
import {createPlaneAndOpenSketcher} from '../coreTests/utils/scripts';
import {checkSplineEndpoints} from '../regression/bspline-endpoints';
window.webosTest = {modellerUISubject, createPlaneAndOpenSketcher, checkSplineEndpoints};
