package cad.gl;

import com.sun.javafx.geom.PickRay;
import com.sun.javafx.scene.input.PickResultChooser;

import javax.media.opengl.GL2;

public abstract class Node {
  
  abstract void draw(GL2 gl);

//  protected final boolean impl_intersects(PickRay pickRay, PickResultChooser pickResult) {
//    double boundsDistance = impl_intersectsBounds(pickRay);
//    if (!Double.isNaN(boundsDistance)) {
//      if (isPickOnBounds()) {
//        if (pickResult != null) {
//          pickResult.offer(this, boundsDistance, PickResultChooser.computePoint(pickRay, boundsDistance));
//        }
//        return true;
//      } else {
//        return impl_computeIntersects(pickRay, pickResult);
//      }
//    }
//    return false;
//  }
  
}
