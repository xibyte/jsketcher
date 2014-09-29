package cad.gl;

import cad.fx.Polygon;
import cad.fx.Utils3D;
import cad.math.Vector;
import com.jogamp.newt.opengl.GLWindow;
import gnu.trove.map.TIntObjectMap;
import gnu.trove.map.hash.TIntObjectHashMap;

import javax.media.opengl.GL2;
import javax.media.opengl.GLAutoDrawable;
import javax.media.opengl.GLCapabilities;
import javax.media.opengl.GLEventListener;
import javax.media.opengl.GLProfile;
import javax.media.opengl.Threading;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Cad3 implements GLEventListener, com.jogamp.newt.event.MouseListener {


  static {
      GLProfile.initSingleton();  // The method allows JOGL to prepare some Linux-specific locking optimizations
  }

  public static List<Polygon> initObjects = Utils3D.createCube(1);

  static TIntObjectMap<Polygon> scene = new TIntObjectHashMap<>();

  private static GLWindow window;

  ExecutorService updater = Executors.newSingleThreadExecutor();

  public static void main(String[] args) throws NoSuchMethodException, ClassNotFoundException {


    // Get the default OpenGL profile, reflecting the best for your running platform
    GLProfile glp = GLProfile.getDefault();
    // Specifies a set of OpenGL capabilities, based on your profile.
    GLCapabilities caps = new GLCapabilities(glp);
    // Create the OpenGL rendering canvas
    window = GLWindow.create(caps);

    // Create a animator that drives canvas' display() at the specified FPS.
//    final FPSAnimator animator = new FPSAnimator(window, 60, true);
////    final Animator animator = new Animator(window);
//    window.addWindowListener(new com.jogamp.newt.event.WindowAdapter() {
//      @Override
//      public void windowDestroyNotify(com.jogamp.newt.event.WindowEvent arg0) {
//        // Use a dedicate thread to run the stop() to ensure that the
//        // animator stops before program exits.
//        new Thread() {
//          @Override
//          public void run() {
//            if (animator.isStarted())
//              animator.stop();    // stop the animator loop
//          }
//        }.start();
//      }
//    });


    window.addGLEventListener(new Cad3());

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

//    animator.start();
  }

  float red[] = {0.8f, 0.1f, 0.0f, 1.0f};
  float green[] = {0.0f, 0.8f, 0.2f, 1.0f};
  float blue[] = {0.2f, 0.2f, 1.0f, 1.0f};
  float white[] = {1.0f, 1.0f, 1.0f};


  private float view_rotx = 20.0f, view_roty = 30.0f, view_rotz = 0.0f;

  private int prevMouseX, prevMouseY;
  private boolean mouseRButtonDown = false;

  public void init(GLAutoDrawable drawable) {
    // Use debug pipeline
    // drawable.setGL(new DebugGL(drawable.getGL()));

    GL2 gl = drawable.getGL().getGL2();

    System.err.println("INIT GL IS: " + gl.getClass().getName());

    System.err.println("Chosen GLCapabilities: " + drawable.getChosenGLCapabilities());

    gl.setSwapInterval(0);

    float pos0[] = {  0.0f, 0.0f, 0.0f, 1.0f };
    gl.glLightfv(GL2.GL_LIGHT0, GL2.GL_POSITION, pos0, 0);

    gl.glEnable(GL2.GL_CULL_FACE);
    gl.glEnable(GL2.GL_DEPTH_TEST);
    gl.glEnable(GL2.GL_LIGHTING);
    gl.glEnable(GL2.GL_LIGHT0);

    initNodes(gl);

    gl.glEnable(GL2.GL_NORMALIZE);

    if (drawable instanceof GLWindow) {
      GLWindow awtDrawable = (GLWindow) drawable;
      awtDrawable.addMouseListener(this);
    }
  }

  private void initNodes(GL2 gl) {
    for (Polygon poly : initObjects) {
      int id = gl.glGenLists(1);
      scene.put(id, poly);
      gl.glNewList(id, GL2.GL_COMPILE);

      //http://devernay.free.fr/cours/opengl/materials.html
//      float[] amb = {0f, 0f, 0f, 0f};
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_AMBIENT, amb, 0);

      float[] diff = {0.6901961f, 0.76862746f, 0.87058824f};
      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_DIFFUSE, diff, 0);

//      float[] spec = {0f, 0f, 0f};
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_SPECULAR, spec, 0);
//      float shine = 0.6f;
//      gl.glMaterialf(GL2.GL_FRONT, GL2.GL_SHININESS, shine * 128.0f);
//      gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_AMBIENT_AND_DIFFUSE, blue, 0);

      gl.glShadeModel(GL2.GL_SMOOTH);

      gl.glEnable(GL2.GL_LIGHTING);

      gl.glBegin(GL2.GL_TRIANGLES);
      gl.glNormal3d(poly.normal.x, poly.normal.y, poly.normal.z);  //very important!!
      for (Vector[] tr : poly.getTriangles()) {
        gl.glVertex3d(tr[0].x, tr[0].y, tr[0].z);
        gl.glVertex3d(tr[1].x, tr[1].y, tr[1].z);
        gl.glVertex3d(tr[2].x, tr[2].y, tr[2].z);
      }
      gl.glEnd();

      gl.glEndList();
    }
    for (Polygon poly : initObjects) {
      int id = gl.glGenLists(1);
      scene.put(id, poly);
      gl.glNewList(id, GL2.GL_COMPILE);
      gl.glShadeModel(GL2.GL_FLAT);
      gl.glLineWidth(1.5f);
      gl.glColor3f(255.0f, 255.0f, 255.0f);
      gl.glDisable(GL2.GL_LIGHTING);

      gl.glNormal3d(poly.normal.x, poly.normal.y, poly.normal.z);
      for (int i = 0; i < poly.shell.size(); i++) {
        gl.glBegin(GL2.GL_LINES);
        Vector a = Polygon.get(poly.shell, i);
        Vector b = Polygon.get(poly.shell, i + 1);
        gl.glVertex3d(a.x, a.y, a.z);
        gl.glVertex3d(b.x, b.y, b.z);
        gl.glEnd();
      }
      gl.glEndList();
    }
  }

  public void reshape(GLAutoDrawable drawable, int x, int y, int width, int height) {
    GL2 gl = drawable.getGL().getGL2();

    float h = (float) height / (float) width;

    gl.glMatrixMode(GL2.GL_PROJECTION);
    gl.glLoadIdentity();
    gl.glFrustum(-1.0f, 1.0f, -h, h, 5.0f, 60.0f);
    gl.glMatrixMode(GL2.GL_MODELVIEW);
    gl.glLoadIdentity();
    gl.glTranslatef(0.0f, 0.0f, -40.0f);
  }

  public void dispose(GLAutoDrawable drawable) {
    System.out.println("Gears.dispose: " + drawable);
  }

  public void display(GLAutoDrawable drawable) {
    GL2 gl = drawable.getGL().getGL2();

    gl.glClearColor(0.5019608f, 0.5019608f, 0.5019608f, 0f);

    gl.glClear(GL2.GL_COLOR_BUFFER_BIT | GL2.GL_DEPTH_BUFFER_BIT);

    gl.glPushMatrix();
    gl.glScalef(scale, scale, scale);

    gl.glPushMatrix();

    gl.glRotatef(view_rotx, 1.0f, 0.0f, 0.0f);
    gl.glRotatef(view_roty, 0.0f, 1.0f, 0.0f);
    gl.glRotatef(view_rotz, 0.0f, 0.0f, 1.0f);

    for (int id : scene.keys()) {
      gl.glCallList(id);
    }

//
//    gl.glPushMatrix();
//    gl.glScalef(3,3,3);
//     gl.glBegin(GL2.GL_QUADS);
//    gl.glNormal3f( 0.0F, 0.0F, 1.0F);
//    gl.glVertex3f( 0.5F, 0.5F, 0.5F); gl.glVertex3f(-0.5F, 0.5F, 0.5F);
//    gl.glVertex3f(-0.5F,-0.5F, 0.5F); gl.glVertex3f( 0.5F,-0.5F, 0.5F);
//
//    gl.glNormal3f( 0.0F, 0.0F,-1.0F);
//    gl.glVertex3f(-0.5F,-0.5F,-0.5F); gl.glVertex3f(-0.5F, 0.5F,-0.5F);
//    gl.glVertex3f( 0.5F, 0.5F,-0.5F); gl.glVertex3f( 0.5F,-0.5F,-0.5F);
//
//    gl.glNormal3f( 0.0F, 1.0F, 0.0F);
//    gl.glVertex3f( 0.5F, 0.5F, 0.5F); gl.glVertex3f( 0.5F, 0.5F,-0.5F);
//    gl.glVertex3f(-0.5F, 0.5F,-0.5F); gl.glVertex3f(-0.5F, 0.5F, 0.5F);
//
//    gl.glNormal3f( 0.0F,-1.0F, 0.0F);
//    gl.glVertex3f(-0.5F,-0.5F,-0.5F); gl.glVertex3f( 0.5F,-0.5F,-0.5F);
//    gl.glVertex3f( 0.5F,-0.5F, 0.5F); gl.glVertex3f(-0.5F,-0.5F, 0.5F);
//
//    gl.glNormal3f( 1.0F, 0.0F, 0.0F);
//    gl.glVertex3f( 0.5F, 0.5F, 0.5F); gl.glVertex3f( 0.5F,-0.5F, 0.5F);
//    gl.glVertex3f( 0.5F,-0.5F,-0.5F); gl.glVertex3f( 0.5F, 0.5F,-0.5F);
//
//    gl.glNormal3f(-1.0F, 0.0F, 0.0F);
//    gl.glVertex3f(-0.5F,-0.5F,-0.5F); gl.glVertex3f(-0.5F,-0.5F, 0.5F);
//    gl.glVertex3f(-0.5F, 0.5F, 0.5F); gl.glVertex3f(-0.5F, 0.5F,-0.5F);
//    gl.glEnd();
//    gl.glPopMatrix();


    gl.glPopMatrix();
    gl.glPopMatrix();
  }

  @Override
  public void mouseClicked(com.jogamp.newt.event.MouseEvent e) {
  }

  @Override
  public void mouseEntered(com.jogamp.newt.event.MouseEvent e) {
  }

  @Override
  public void mouseExited(com.jogamp.newt.event.MouseEvent e) {
  }

  @Override
  public void mousePressed(com.jogamp.newt.event.MouseEvent e) {
    prevMouseX = e.getX();
    prevMouseY = e.getY();
    if ((e.getModifiers() & e.BUTTON3_MASK) != 0) {
      mouseRButtonDown = true;
    }
  }

  @Override
  public void mouseReleased(com.jogamp.newt.event.MouseEvent e) {
    if ((e.getModifiers() & e.BUTTON3_MASK) != 0) {
      mouseRButtonDown = false;
    }

  }

  @Override
  public void mouseMoved(com.jogamp.newt.event.MouseEvent e) {
  }

  @Override
  public void mouseDragged(com.jogamp.newt.event.MouseEvent e) {
    int x = e.getX();
    int y = e.getY();

    int width = window.getWidth();
    int height = window.getHeight();

    float thetaY = 360.0f * ((float) (x - prevMouseX) / (float) width);
    float thetaX = 360.0f * ((float) (prevMouseY - y) / (float) height);

    prevMouseX = x;
    prevMouseY = y;

    view_rotx += thetaX;
    view_roty += thetaY;

    update(window::display);
  }



  volatile boolean updating = false;

  private void update(Runnable op) {
    if (updating) {
      return;
    }

    Threading.invokeOnOpenGLThread(false, new Runnable() {
      @Override
      public void run() {
        try {
          updating = true;

          op.run();
        } finally {
          updating = false;
        }
      }
    });

//    updater.execute(() -> {
//      try {
//        updating = true;
//
//        op.run();
//      } finally {
//        updating = false;
//      }
//    });
  }

  final double SCALE_DELTA = 1.1;
  float scale = 1;

  @Override
  public void mouseWheelMoved(com.jogamp.newt.event.MouseEvent e) {
    double scaleFactor = e.getRotation()[1] > 0 ? SCALE_DELTA : 1 / SCALE_DELTA;
    scale *= scaleFactor;
    update(window::display);
  }
}
