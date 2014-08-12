package cad;

import com.jogamp.newt.opengl.GLWindow;
import com.jogamp.opengl.util.FPSAnimator;

import javax.media.opengl.GL2;
import javax.media.opengl.GLAutoDrawable;
import javax.media.opengl.GLCapabilities;
import javax.media.opengl.GLEventListener;
import javax.media.opengl.GLProfile;
import javax.media.opengl.awt.AWTGLAutoDrawable;
import javax.media.opengl.awt.GLJPanel;
import java.awt.*;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;

public class Cad implements GLEventListener, com.jogamp.newt.event.MouseListener {


  static {
      GLProfile.initSingleton();  // The method allows JOGL to prepare some Linux-specific locking optimizations
  }

  private static GLWindow window;

  public static void main(String[] args) {

    // Get the default OpenGL profile, reflecting the best for your running platform
    GLProfile glp = GLProfile.getDefault();
    // Specifies a set of OpenGL capabilities, based on your profile.
    GLCapabilities caps = new GLCapabilities(glp);
    // Create the OpenGL rendering canvas
    window = GLWindow.create(caps);

    // Create a animator that drives canvas' display() at the specified FPS.
    final FPSAnimator animator = new FPSAnimator(window, 60, true);
////    final Animator animator = new Animator(window);
    window.addWindowListener(new com.jogamp.newt.event.WindowAdapter() {
      @Override
      public void windowDestroyNotify(com.jogamp.newt.event.WindowEvent arg0) {
        // Use a dedicate thread to run the stop() to ensure that the
        // animator stops before program exits.
        new Thread() {
          @Override
          public void run() {
            if (animator.isStarted())
              animator.stop();    // stop the animator loop
          }
        }.start();
      }
    });

    window.addGLEventListener(new Cad());

    window.setSize(640, 480);
    window.setTitle("CAD");
    window.setVisible(true);


    new Thread(new Runnable() {
      public void run() {
        final Object monitor = new Object();
        synchronized (monitor) {
          while (true)
          try {
            monitor.wait();
          } catch (InterruptedException e) {
          }
        }
      }
    }).start();
//    animator.start();
  }

  private float view_rotx = 20.0f, view_roty = 30.0f, view_rotz = 0.0f;
  private int gear1;
  private float angle = 0.0f;

  private int prevMouseX, prevMouseY;
  private boolean mouseRButtonDown = false;

  public void init(GLAutoDrawable drawable) {
    // Use debug pipeline
    // drawable.setGL(new DebugGL(drawable.getGL()));

    GL2 gl = drawable.getGL().getGL2();

    System.err.println("INIT GL IS: " + gl.getClass().getName());

    System.err.println("Chosen GLCapabilities: " + drawable.getChosenGLCapabilities());

    gl.setSwapInterval(1);

    float pos[] = {5.0f, 5.0f, 10.0f, 0.0f};
    float red[] = {0.8f, 0.1f, 0.0f, 1.0f};
    float green[] = {0.0f, 0.8f, 0.2f, 1.0f};
    float blue[] = {0.2f, 0.2f, 1.0f, 1.0f};

    gl.glLightfv(GL2.GL_LIGHT0, GL2.GL_POSITION, pos, 0);
    gl.glEnable(GL2.GL_CULL_FACE);
    gl.glEnable(GL2.GL_LIGHTING);
    gl.glEnable(GL2.GL_LIGHT0);
    gl.glEnable(GL2.GL_DEPTH_TEST);
            
    /* make the gears */
    gear1 = gl.glGenLists(1);
    gl.glNewList(gear1, GL2.GL_COMPILE);
    gl.glMaterialfv(GL2.GL_FRONT, GL2.GL_AMBIENT_AND_DIFFUSE, red, 0);
    gear(gl, 1.0f, 4.0f, 1.0f, 20, 0.7f);
    gl.glEndList();

    gl.glEnable(GL2.GL_NORMALIZE);



    if (drawable instanceof GLWindow) {
      GLWindow awtDrawable = (GLWindow) drawable;
      awtDrawable.addMouseListener(this);
    }
  }

  public void reshape(GLAutoDrawable drawable, int x, int y, int width, int height) {
    GL2 gl = drawable.getGL().getGL2();

    float h = (float) height / (float) width;

    gl.glMatrixMode(GL2.GL_PROJECTION);

    System.err.println("GL_VENDOR: " + gl.glGetString(GL2.GL_VENDOR));
    System.err.println("GL_RENDERER: " + gl.glGetString(GL2.GL_RENDERER));
    System.err.println("GL_VERSION: " + gl.glGetString(GL2.GL_VERSION));
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
    // Turn the gears' teeth
    angle += 2.0f;

    // Get the GL corresponding to the drawable we are animating
    GL2 gl = drawable.getGL().getGL2();

    // Special handling for the case where the GLJPanel is translucent
    // and wants to be composited with other Java 2D content
    if ((drawable instanceof GLJPanel) &&
        !((GLJPanel) drawable).isOpaque() &&
        ((GLJPanel) drawable).shouldPreserveColorBufferIfTranslucent()) {
      gl.glClear(GL2.GL_DEPTH_BUFFER_BIT);
    } else {
      gl.glClear(GL2.GL_COLOR_BUFFER_BIT | GL2.GL_DEPTH_BUFFER_BIT);
    }

    // Rotate the entire assembly of gears based on how the user
    // dragged the mouse around
    gl.glPushMatrix();
    gl.glRotatef(view_rotx, 1.0f, 0.0f, 0.0f);
    gl.glRotatef(view_roty, 0.0f, 1.0f, 0.0f);
    gl.glRotatef(view_rotz, 0.0f, 0.0f, 1.0f);

    // Place the first gear and call its display list
    gl.glPushMatrix();
    gl.glTranslatef(-3.0f, -2.0f, 0.0f);
    gl.glRotatef(angle, 0.0f, 0.0f, 1.0f);
    gl.glCallList(gear1);
    gl.glPopMatrix();


    // Remember that every push needs a pop; this one is paired with
    // rotating the entire gear assembly
    gl.glPopMatrix();
  }

  public void displayChanged(GLAutoDrawable drawable, boolean modeChanged, boolean deviceChanged) {
  }

  public static void gear(GL2 gl,
                          float inner_radius,
                          float outer_radius,
                          float width,
                          int teeth,
                          float tooth_depth) {
    int i;
    float r0, r1, r2;
    float angle, da;
    float u, v, len;

    r0 = inner_radius;
    r1 = outer_radius - tooth_depth / 2.0f;
    r2 = outer_radius + tooth_depth / 2.0f;

    da = 2.0f * (float) Math.PI / teeth / 4.0f;

    gl.glShadeModel(GL2.GL_FLAT);

    gl.glNormal3f(0.0f, 0.0f, 1.0f);

    /* draw front face */
    gl.glBegin(GL2.GL_QUAD_STRIP);
    for (i = 0; i <= teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), width * 0.5f);
      if (i < teeth) {
        gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), width * 0.5f);
        gl.glVertex3f(r1 * (float) Math.cos(angle + 3.0f * da), r1 * (float) Math.sin(angle + 3.0f * da), width * 0.5f);
      }
    }
    gl.glEnd();

    /* draw front sides of teeth */
    gl.glBegin(GL2.GL_QUADS);
    for (i = 0; i < teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + da), r2 * (float) Math.sin(angle + da), width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + 2.0f * da), r2 * (float) Math.sin(angle + 2.0f * da), width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle + 3.0f * da), r1 * (float) Math.sin(angle + 3.0f * da), width * 0.5f);
    }
    gl.glEnd();
    
    /* draw back face */
    gl.glBegin(GL2.GL_QUAD_STRIP);
    for (i = 0; i <= teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), -width * 0.5f);
      gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), -width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle + 3 * da), r1 * (float) Math.sin(angle + 3 * da), -width * 0.5f);
      gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), -width * 0.5f);
    }
    gl.glEnd();
    
    /* draw back sides of teeth */
    gl.glBegin(GL2.GL_QUADS);
    for (i = 0; i < teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glVertex3f(r1 * (float) Math.cos(angle + 3 * da), r1 * (float) Math.sin(angle + 3 * da), -width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + 2 * da), r2 * (float) Math.sin(angle + 2 * da), -width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + da), r2 * (float) Math.sin(angle + da), -width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), -width * 0.5f);
    }
    gl.glEnd();
    
    /* draw outward faces of teeth */
    gl.glBegin(GL2.GL_QUAD_STRIP);
    for (i = 0; i < teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle), r1 * (float) Math.sin(angle), -width * 0.5f);
      u = r2 * (float) Math.cos(angle + da) - r1 * (float) Math.cos(angle);
      v = r2 * (float) Math.sin(angle + da) - r1 * (float) Math.sin(angle);
      len = (float) Math.sqrt(u * u + v * v);
      u /= len;
      v /= len;
      gl.glNormal3f(v, -u, 0.0f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + da), r2 * (float) Math.sin(angle + da), width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + da), r2 * (float) Math.sin(angle + da), -width * 0.5f);
      gl.glNormal3f((float) Math.cos(angle), (float) Math.sin(angle), 0.0f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + 2 * da), r2 * (float) Math.sin(angle + 2 * da), width * 0.5f);
      gl.glVertex3f(r2 * (float) Math.cos(angle + 2 * da), r2 * (float) Math.sin(angle + 2 * da), -width * 0.5f);
      u = r1 * (float) Math.cos(angle + 3 * da) - r2 * (float) Math.cos(angle + 2 * da);
      v = r1 * (float) Math.sin(angle + 3 * da) - r2 * (float) Math.sin(angle + 2 * da);
      gl.glNormal3f(v, -u, 0.0f);
      gl.glVertex3f(r1 * (float) Math.cos(angle + 3 * da), r1 * (float) Math.sin(angle + 3 * da), width * 0.5f);
      gl.glVertex3f(r1 * (float) Math.cos(angle + 3 * da), r1 * (float) Math.sin(angle + 3 * da), -width * 0.5f);
      gl.glNormal3f((float) Math.cos(angle), (float) Math.sin(angle), 0.0f);
    }
    gl.glVertex3f(r1 * (float) Math.cos(0), r1 * (float) Math.sin(0), width * 0.5f);
    gl.glVertex3f(r1 * (float) Math.cos(0), r1 * (float) Math.sin(0), -width * 0.5f);
    gl.glEnd();

    gl.glShadeModel(GL2.GL_SMOOTH);
    
    /* draw inside radius cylinder */
    gl.glBegin(GL2.GL_QUAD_STRIP);
    for (i = 0; i <= teeth; i++) {
      angle = i * 2.0f * (float) Math.PI / teeth;
      gl.glNormal3f(-(float) Math.cos(angle), -(float) Math.sin(angle), 0.0f);
      gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), -width * 0.5f);
      gl.glVertex3f(r0 * (float) Math.cos(angle), r0 * (float) Math.sin(angle), width * 0.5f);
    }
    gl.glEnd();
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
  }

  @Override
  public void mouseWheelMoved(com.jogamp.newt.event.MouseEvent e) {
  }
}
