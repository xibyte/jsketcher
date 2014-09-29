package cad.gl;

import cad.fx.Utils3D;
import cad.gl.MeshNode;
import cad.gl.Scene;
import com.jogamp.newt.opengl.GLWindow;

import javax.media.opengl.GLCapabilities;
import javax.media.opengl.GLProfile;
import java.util.concurrent.Executors;

public class Cad {

  static {
      GLProfile.initSingleton();  // The method allows JOGL to prepare some Linux-specific locking optimizations
  }

  public static void main(String[] args) throws NoSuchMethodException, ClassNotFoundException {

    // Get the default OpenGL profile, reflecting the best for your running platform
    GLProfile glp = GLProfile.getDefault();
    GLCapabilities caps = new GLCapabilities(glp);
    GLWindow window = GLWindow.create(caps);

    Scene scene = new Scene(window);
    scene.addNode(new MeshNode(Utils3D.createCube(1)));
    window.setSize(640, 480);
    window.setTitle("CAD");
    window.setVisible(true);


    Executors.newSingleThreadExecutor().execute(() -> {
      Object monitor = new Object();
      while (true) {
        try {
          synchronized (monitor) {
            monitor.wait();
          }
        } catch (InterruptedException e) {
        }
      }
    });
  }
}
