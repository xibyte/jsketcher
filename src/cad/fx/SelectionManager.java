package cad.fx;

import com.sun.javafx.collections.TrackableObservableList;
import javafx.collections.ListChangeListener;
import javafx.collections.ObservableList;
import javafx.scene.Node;

import java.util.ArrayList;
import java.util.List;

public class SelectionManager {

  private final List<Listener> listeners = new ArrayList<>();

  public void addListener(Listener listener) {
    listeners.add(listener);
  }

  private final ObservableList<Node> selection = new TrackableObservableList<Node>() {

    protected void onChanged(ListChangeListener.Change<Node> c) {
      while (c.next()) {
        if (c.wasAdded()) {
          List<Node> added = c.getAddedSubList();
          added.forEach((n) -> {
            ObservableList<String> styleClass = n.getStyleClass();
            if (!styleClass.contains("selected")) {
              styleClass.add("selected");
            }
          });
          fireSelected(added);
        } else if (c.wasRemoved()) {
          List<Node> removed = c.getRemoved();
          removed.forEach((n) -> n.getStyleClass().removeAll("selected"));
          fireRemoved(removed);
        }
      }
    }
  };

  private void fireRemoved(List<Node> removed) {
    for (Listener l : listeners) {
      l.removed(removed);
    }
  }

  private void fireSelected(List<Node> added) {
    for (Listener l : listeners) {
      l.added(added);
    }
  }

  public ObservableList<Node> getSelection() {
    return selection;
  }

  public interface Listener {
    void added(List<Node> nodes);
    void removed(List<Node> nodes);
  }

  public void selectExclusively(Node node) {
    selection.clear();
    selection.add(node);
  }
}
