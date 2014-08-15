package cad.gl;

import javax.media.opengl.GL2;

/**
 * Created by verastov
 */
public class CompiledNode {

  public final int glId;
  public final Node node;

  public CompiledNode(Node node, GL2 gl) {
    this.node = node;
    glId = gl.glGenLists(1);
    gl.glNewList(glId, GL2.GL_COMPILE);
    node.draw(gl);
    gl.glEndList();
  }
}
