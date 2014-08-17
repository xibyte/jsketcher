package cad.gl;

import cad.fx.Polygon;
import cad.math.Vector;
import com.jogamp.newt.event.MouseEvent;
import com.jogamp.newt.event.MouseListener;
import com.jogamp.newt.opengl.GLWindow;
import com.sun.javafx.geom.*;
import javafx.scene.input.PickResult;

import javax.media.opengl.GL2;
import javax.media.opengl.GLAutoDrawable;
import javax.media.opengl.GLEventListener;
import javax.media.opengl.Threading;
import javax.media.opengl.glu.GLU;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Scene implements GLEventListener, MouseListener {

  private final List<Node> toCompile = new ArrayList<>();
  private final List<CompiledNode> scene = new ArrayList<>();
  private final GLWindow window;
  private final Camera camera = new Camera();
  private Vector[] pickRay = {new Vector(), new Vector()};
  private float winMouseY;
  private float winMouseX;
  private boolean pickRequest = false;

  public Scene(GLWindow window) {
    this.window = window;
    window.addGLEventListener(this);
  }

  float red[] = {0.8f, 0.1f, 0.0f, 1.0f};
  float green[] = {0.0f, 0.8f, 0.2f, 1.0f};
  float blue[] = {0.2f, 0.2f, 1.0f, 1.0f};
  float white[] = {1.0f, 1.0f, 1.0f};

  private float view_rotx = 0.0f, view_roty = 0.0f, view_rotz = 0.0f;
//  private float view_rotx = 20.0f, view_roty = 30.0f, view_rotz = 0.0f;

  private int prevMouseX, prevMouseY;
  private boolean mouseRButtonDown = false;

  public void init(GLAutoDrawable drawable) {
    // Use debug pipeline
    // drawable.setGL(new DebugGL(drawable.getGL()));

    GL2 gl = drawable.getGL().getGL2();

    System.err.println("INIT GL IS: " + gl.getClass().getName());

    System.err.println("Chosen GLCapabilities: " + drawable.getChosenGLCapabilities());

    gl.setSwapInterval(0);

    float pos0[] = { 0.0f, 0.0f, 0.0f, 1.0f };
    gl.glLightfv(GL2.GL_LIGHT0, GL2.GL_POSITION, pos0, 0);

    gl.glEnable(GL2.GL_CULL_FACE);
    gl.glEnable(GL2.GL_DEPTH_TEST);
    gl.glEnable(GL2.GL_LIGHTING);
    gl.glEnable(GL2.GL_LIGHT0);

    compileNodes(gl);

    gl.glEnable(GL2.GL_NORMALIZE);

    window.addMouseListener(this);
  }

  private void compileNodes(GL2 gl) {
    if (toCompile.isEmpty()) {
      return;      
    }
    for (Node node : toCompile) {
      scene.add(new CompiledNode(node, gl));
    }
  }

  public void reshape(GLAutoDrawable drawable, int x, int y, int width, int height) {
    GL2 gl = drawable.getGL().getGL2();
    
    camera.sceneW = width;
    camera.sceneH = height;
    camera.aspect = (float) height / (float) width;
    
    gl.glMatrixMode(GL2.GL_PROJECTION);
    gl.glLoadIdentity();
    gl.glFrustum(-camera.near_width, camera.near_width, 
            -camera.aspect * camera.near_width, camera.aspect * camera.near_width, 
            camera.near, camera.far);
    gl.glMatrixMode(GL2.GL_MODELVIEW);
    gl.glLoadIdentity();
    gl.glTranslatef(0.0f, 0.0f, -40.0f);
  }

  public void dispose(GLAutoDrawable drawable) {
    System.out.println("dispose: " + drawable);
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

    updatePickRay(gl);
    drawPickRay(gl);

    for (CompiledNode cn : scene) {
      gl.glCallList(cn.glId);
    }

    gl.glPopMatrix();
    gl.glPopMatrix();
  }

  private void updatePickRay(GL2 gl) {
    if (!pickRequest) {
      return;
    }
    pickRequest = false;
    float[] model = new float[16];
    float[] proj = new float[16];
    int[] viewport = new int[16];

    gl.glGetIntegerv(GL2.GL_VIEWPORT, viewport, 0);
    gl.glGetFloatv(GL2.GL_MODELVIEW_MATRIX, model, 0);
    gl.glGetFloatv(GL2.GL_PROJECTION_MATRIX, proj, 0);

    float[] out = new float[3];
    float y = viewport[3] - winMouseY;
    
    glu.gluUnProject(winMouseX, y, 0, model, 0, proj, 0, viewport, 0, out, 0);
    pickRay[0].set3(out);

    glu.gluUnProject(winMouseX, y, 1, model, 0, proj, 0, viewport, 0, out, 0);
    pickRay[1].set3(out);


//    Vector dir = pickRay[1].minus(pickRay[0]);
    
//    pickRay[1] = pickRay[1].minus(pickRay[0]).scale(700);//.normalize().scale(55);
    pickRay[1] = pickRay[1].minus(pickRay[0]).normalize().scale(30);
  }

  public static float[] fixW(float[] v) {
    float w = v[3];
    for (int i = 0; i < 4; i++)
      v[i] = v[i] / w;
    return v;
  }

  private void drawPickRay(GL2 gl) {

    if (pickRay != null) {

      gl.glShadeModel(GL2.GL_FLAT);
      gl.glLineWidth(1.5f);
      gl.glColor3f(255.0f, 255.0f, 255.0f);
      gl.glDisable(GL2.GL_LIGHTING);

      gl.glBegin(GL2.GL_LINES);
//      Vector a = pickRay;
//      Vector b = pickRay.plus(pickRay.normalize().scale(-60));
      vertex(gl, pickRay[0]);
      vertex(gl, pickRay[1]);
      System.out.println(Arrays.toString(pickRay));
      gl.glEnd();
    }
  }

  private void vertex(GL2 gl, Vector vector) {
    gl.glVertex3d(vector.x, vector.y, vector.z);
  }

  @Override
  public void mouseClicked(MouseEvent e) {
    computePickRay(e.getX(), e.getY());
    update(window::display);
    pickRequest = true;
  }

  @Override
  public void mouseEntered(MouseEvent e) {
  }

  @Override
  public void mouseExited(MouseEvent e) {
  }

  @Override
  public void mousePressed(MouseEvent e) {
    prevMouseX = e.getX();
    prevMouseY = e.getY();
    if ((e.getModifiers() & e.BUTTON3_MASK) != 0) {
      mouseRButtonDown = true;
    }
  }

  @Override
  public void mouseReleased(MouseEvent e) {
    if ((e.getModifiers() & e.BUTTON3_MASK) != 0) {
      mouseRButtonDown = false;
    }

  }

  @Override
  public void mouseMoved(MouseEvent e) {
  }

  @Override
  public void mouseDragged(MouseEvent e) {
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
  }

  final double SCALE_DELTA = 1.1;
  float scale = 1;

  @Override
  public void mouseWheelMoved(MouseEvent e) {
    double scaleFactor = e.getRotation()[1] > 0 ? SCALE_DELTA : 1 / SCALE_DELTA;
    scale *= scaleFactor;
    update(window::display);
  }
  
  public void addNode(Node node) {
    toCompile.add(node);   
  }


//  private PickResult pick(final double x, final double y) {
//    final PickRay pickRay = computePickRay(x, y);
//    final double mag = pickRay.getDirectionNoClone().length();
//    pickRay.getDirectionNoClone().normalize();
//    final PickResult res = pickNode(pickRay);
//    return res;
//  }

  GLU glu = new GLU();

  private void computePickRay(float mx, float my) {

//    winMouseX = mx - camera.sceneW / 2;
//    winMouseY = (camera.sceneH - my) - camera.sceneH / 2;

    winMouseX = mx;
    winMouseY = my;
//
//
//    float winY = (camera.sceneH - my) - camera.sceneH/2;
//    double norm_y = winY/(camera.sceneH/2);
//
//    float winX = mx - camera.sceneW/2;
//    double norm_x = winX/(camera.sceneW/2);

//
//    double y = camera.near_width * norm_y * camera.aspect;
//    double x = camera.near_width * norm_x;
//    System.out.println(x + ":" + y);
//    return new Vector(x, y, camera.near);
  }

  private PickResult pickNode(PickRay ray) {
    return null;
  }

}
