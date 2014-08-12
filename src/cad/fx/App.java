package cad.fx;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class App extends Application {

  public static void main(String[] args) {
    System.setProperty("prism.dirtyopts", "false");
    launch(args);
  }

  @Override
  public void start(Stage primaryStage) throws Exception {
    Scene scene = new Scene(FXMLLoader.load(AppCtrl.class.getResource("app.fxml")), 1024, 1100);
    primaryStage.setTitle("Solid CAD");
    primaryStage.setScene(scene);
    primaryStage.show();
  }
}
