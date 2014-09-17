/*
 * Copyright (c) 2011, 2013 Oracle and/or its affiliates.
 * All rights reserved. Use is subject to license terms.
 *
 * This file is available and licensed under the following license:
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *  - Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  - Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the distribution.
 *  - Neither the name of Oracle nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package cad.fx.viewer;

import javafx.animation.Timeline;
import javafx.event.EventHandler;
import javafx.geometry.Point3D;
import javafx.scene.*;
import javafx.scene.input.KeyEvent;
import javafx.scene.input.MouseEvent;
import javafx.scene.input.ScrollEvent;
import javafx.scene.paint.Color;
import javafx.scene.paint.PhongMaterial;
import javafx.scene.shape.Box;
import javafx.scene.shape.Sphere;
import javafx.scene.transform.Rotate;
import javafx.util.Duration;

public class Viewer3D extends SubScene {

  final Group root = new Group();
  final Group axisGroup = new Group();
  public final Xform world = new Xform();
  final PerspectiveCamera camera = new PerspectiveCamera(true);
  final Xform cameraXform = new Xform();
  final Xform cameraXform2 = new Xform();
  final Xform cameraXform3 = new Xform();
  final double cameraDistance = 450;
  final Xform modelGroup = new Xform();
  public final Xform modelXform = new Xform();
  private Timeline timeline;
  boolean timelinePlaying = false;
  double ONE_FRAME = 1.0 / 24.0;
  double DELTA_MULTIPLIER = 200.0;
  double CONTROL_MULTIPLIER = 0.1;
  double SHIFT_MULTIPLIER = 0.1;
  double ALT_MULTIPLIER = 0.5;
  double mousePosX;
  double mousePosY;
  double mouseOldX;
  double mouseOldY;
  double mouseDeltaX;
  double mouseDeltaY;

  public Viewer3D() {
    super(new Group(), 1024, 768, true, SceneAntialiasing.DISABLED);
    ((Group)getRoot()).getChildren().add(world);
    buildCamera();
    buildAxes();
    modelGroup.getChildren().add(modelXform);
    world.getChildren().addAll(modelGroup);
    world.getTransforms().add(new Rotate(180, new Point3D(1,0,0))); //fix Y-axis
//    scene = new SubScene();
    setFill(Color.GREY);
    handleKeyboard(this, world);
    handleMouse(this, world);
    setCamera(camera);
  }

  public void setContent(Node content) {
    modelXform.getChildren().setAll(content);
  }

  private void buildCamera() {
    root.getChildren().add(cameraXform);
    cameraXform.getChildren().add(cameraXform2);
    cameraXform2.getChildren().add(cameraXform3);
    cameraXform3.getChildren().add(camera);
//    cameraXform3.setRotateZ(180.0);

    camera.setNearClip(0.1);
    camera.setFarClip(10000.0);
    camera.setTranslateZ(-cameraDistance);
    cameraXform.ry.setAngle(315.0);
    cameraXform.rx.setAngle(-25);
  }

  private void buildAxes() {
    final PhongMaterial redMaterial = new PhongMaterial();
    redMaterial.setDiffuseColor(Color.DARKRED);
    redMaterial.setSpecularColor(Color.RED);

    final PhongMaterial greenMaterial = new PhongMaterial();
    greenMaterial.setDiffuseColor(Color.DARKGREEN);
    greenMaterial.setSpecularColor(Color.GREEN);

    final PhongMaterial blueMaterial = new PhongMaterial();
    blueMaterial.setDiffuseColor(Color.DARKBLUE);
    blueMaterial.setSpecularColor(Color.BLUE);


    Sphere xArrow = new Sphere(1);
    Sphere yArrow = new Sphere(1);
    Sphere zArrow = new Sphere(1);

    xArrow.setTranslateX(120);
    yArrow.setTranslateY(120);
    zArrow.setTranslateZ(120);

    double axisWidth = 0.5;
    final Box xAxis = new Box(240.0, axisWidth, axisWidth);
    final Box yAxis = new Box(axisWidth, 240.0, axisWidth);
    final Box zAxis = new Box(axisWidth, axisWidth, 240.0);

    xAxis.setMaterial(redMaterial);
    yAxis.setMaterial(greenMaterial);
    zAxis.setMaterial(blueMaterial);

    axisGroup.getChildren().addAll(xAxis, yAxis, zAxis, xArrow, yArrow, zArrow);
    world.getChildren().addAll(axisGroup);
  }

  final double SCALE_DELTA = 1.1;
  private void handleMouse(SubScene scene, final Node root) {
    scene.setOnScroll(new EventHandler<ScrollEvent>() {
      public void handle(ScrollEvent event) {
        event.consume();
        if (event.getDeltaY() == 0) {
          return;
        }
//
        double scaleFactor = event.getDeltaY() > 0 ? SCALE_DELTA : 1 / SCALE_DELTA;
        cameraXform.setScale(scaleFactor * cameraXform.s.getX());
      }
    });
    scene.setOnMousePressed(new EventHandler<MouseEvent>() {
      @Override
      public void handle(MouseEvent me) {
        mousePosX = me.getSceneX();
        mousePosY = me.getSceneY();
        mouseOldX = me.getSceneX();
        mouseOldY = me.getSceneY();
      }
    });
    scene.setOnMouseDragged(new EventHandler<MouseEvent>() {
      @Override
      public void handle(MouseEvent me) {
        mouseOldX = mousePosX;
        mouseOldY = mousePosY;
        mousePosX = me.getSceneX();
        mousePosY = me.getSceneY();
        mouseDeltaX = (mousePosX - mouseOldX);
        mouseDeltaY = (mousePosY - mouseOldY);

        double modifierFactor = 0.1;

        if (me.isPrimaryButtonDown()) {
          double modifier = 1.0;
          if (me.isControlDown()) modifier = 0.1;
          if (me.isShiftDown()) modifier = 10.0;

          cameraXform.ry.setAngle(cameraXform.ry.getAngle() + mouseDeltaX * modifierFactor * modifier * 2.0);  // +
          cameraXform.rx.setAngle(cameraXform.rx.getAngle() - mouseDeltaY * modifierFactor * modifier * 2.0);  // -
//          System.out.println(cameraXform.ry.getAngle() + ":" + cameraXform.rx.getAngle());
        } else if (me.isSecondaryButtonDown()) {
          double modifier = 1.0;
          if (me.isControlDown()) modifier = 0.1;
          if (me.isShiftDown()) modifier = 10.0;

          double z = camera.getTranslateZ();
          double newZ = z + mouseDeltaX * modifierFactor * modifier;
          camera.setTranslateZ(newZ);
        } else if (me.isMiddleButtonDown()) {
          double modifier = 10.0;
          if (me.isControlDown()) modifier = 0.1;

          cameraXform2.t.setX(cameraXform2.t.getX() - mouseDeltaX * modifierFactor * modifier * 0.3);  // -
          cameraXform2.t.setY(cameraXform2.t.getY() - mouseDeltaY * modifierFactor * modifier * 0.3);  // -
        }
      }
    });
  }

  private void handleKeyboard(SubScene scene, final Node root) {
    final boolean moveCamera = true;
    scene.setOnKeyPressed(new EventHandler<KeyEvent>() {
      @Override
      public void handle(KeyEvent event) {
        Duration currentTime;
        switch (event.getCode()) {
          case Z:
            if (event.isShiftDown()) {
              cameraXform.ry.setAngle(0.0);
              cameraXform.rx.setAngle(0.0);
              camera.setTranslateZ(-300.0);
            }
            cameraXform2.t.setX(0.0);
            cameraXform2.t.setY(0.0);
            break;
          case X:
            if (event.isControlDown()) {
              if (axisGroup.isVisible()) {
                axisGroup.setVisible(false);
              } else {
                axisGroup.setVisible(true);
              }
            }
            break;
          case S:
            if (event.isControlDown()) {
              if (modelGroup.isVisible()) {
                modelGroup.setVisible(false);
              } else {
                modelGroup.setVisible(true);
              }
            }
            break;
          case SPACE:
            if (timelinePlaying) {
              timeline.pause();
              timelinePlaying = false;
            } else {
              timeline.play();
              timelinePlaying = true;
            }
            break;
          case UP:
            if (event.isControlDown() && event.isShiftDown()) {
              cameraXform2.t.setY(cameraXform2.t.getY() - 10.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown() && event.isShiftDown()) {
              cameraXform.rx.setAngle(cameraXform.rx.getAngle() - 10.0 * ALT_MULTIPLIER);
            } else if (event.isControlDown()) {
              cameraXform2.t.setY(cameraXform2.t.getY() - 1.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown()) {
              cameraXform.rx.setAngle(cameraXform.rx.getAngle() - 2.0 * ALT_MULTIPLIER);
            } else if (event.isShiftDown()) {
              double z = camera.getTranslateZ();
              double newZ = z + 5.0 * SHIFT_MULTIPLIER;
              camera.setTranslateZ(newZ);
            }
            break;
          case DOWN:
            if (event.isControlDown() && event.isShiftDown()) {
              cameraXform2.t.setY(cameraXform2.t.getY() + 10.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown() && event.isShiftDown()) {
              cameraXform.rx.setAngle(cameraXform.rx.getAngle() + 10.0 * ALT_MULTIPLIER);
            } else if (event.isControlDown()) {
              cameraXform2.t.setY(cameraXform2.t.getY() + 1.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown()) {
              cameraXform.rx.setAngle(cameraXform.rx.getAngle() + 2.0 * ALT_MULTIPLIER);
            } else if (event.isShiftDown()) {
              double z = camera.getTranslateZ();
              double newZ = z - 5.0 * SHIFT_MULTIPLIER;
              camera.setTranslateZ(newZ);
            }
            break;
          case RIGHT:
            if (event.isControlDown() && event.isShiftDown()) {
              cameraXform2.t.setX(cameraXform2.t.getX() + 10.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown() && event.isShiftDown()) {
              cameraXform.ry.setAngle(cameraXform.ry.getAngle() - 10.0 * ALT_MULTIPLIER);
            } else if (event.isControlDown()) {
              cameraXform2.t.setX(cameraXform2.t.getX() + 1.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown()) {
              cameraXform.ry.setAngle(cameraXform.ry.getAngle() - 2.0 * ALT_MULTIPLIER);
            }
            break;
          case LEFT:
            if (event.isControlDown() && event.isShiftDown()) {
              cameraXform2.t.setX(cameraXform2.t.getX() - 10.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown() && event.isShiftDown()) {
              cameraXform.ry.setAngle(cameraXform.ry.getAngle() + 10.0 * ALT_MULTIPLIER);  // -
            } else if (event.isControlDown()) {
              cameraXform2.t.setX(cameraXform2.t.getX() - 1.0 * CONTROL_MULTIPLIER);
            } else if (event.isAltDown()) {
              cameraXform.ry.setAngle(cameraXform.ry.getAngle() + 2.0 * ALT_MULTIPLIER);  // -
            }
            break;
        }
      }
    });
  }
}