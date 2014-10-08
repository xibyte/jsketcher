package cad;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Java2JS {

  List<MatchResult> comments = new ArrayList<>();
  List<MatchResult> symbols = new ArrayList<>();
//  List<MatchResult> methods = new ArrayList<>();
  int initCount = 0;

  public void convert() throws FileNotFoundException {

//    Scanner scanner = new Scanner(Java2JS.class.getResourceAsStream("lm.in"));
    Scanner scanner = new Scanner(new FileInputStream("/home/xibyte/Dropbox/project/cadit/src/cad/gcs/constr/Perpendicular.java"));

    String text = scanner.useDelimiter("\\A").next();

    recordTo(symbols);
    text = rplc(text, "(?<![A-Za-z0-9_])(private|public|protected)\\s.+\\s([A-Za-z0-9_]+);", "this.%s = null;", 2);
    recordTo(null);

    text = rplc(text, "\\snew double\\[(.+)\\];", " arr(%s);", 1);
    text = rplc(text, "\\snew int\\[(.+)\\];", " arr(%s);", 1);
    text = rplc(text, "(?<![A-Za-z0-9_])(double|int)[\\[\\]]*\\s", "var ");


//    text = rplc(text, "for\\s+\\((int|double)\\s", "for (var ");
    text = rplc(text, "FastMath", "Math");
    text = rplc(text, "Arrays\\.fill", "Arrays_fill");
    text = rplc(text, "Double\\.NEGATIVE_INFINITY", "Number.NEGATIVE_INFINITY");


    recordTo(symbols);
    text = rplc(text, "(protected|public|private)\\s[a-zA-Z0-9_]+\\s([a-zA-Z0-9_]+)\\(",
        "this.%s = function(", 2);
    recordTo(null);

    text = rplc(text, "new\\sPointVectorValuePair\\((.+)\\)", "[%s]", 1);
    text = rplc(text, "PointVectorValuePair\\s", "var ");

    text = rplcParams(text);
    text = rplc(text, "final ", "", 0);
    text = rplc(text, "@Override", "", 0);

    text = rplcSymbols(text);

    System.out.println(text);
  }

  private String rplcSymbols(String text) {
    for (MatchResult symbol : symbols) {
      String sym = symbol.group(2);
      text = rplc(text, "(?<!(this\\.|[A-Za-z0-9_]))" + sym+"(?![A-Za-z0-9_])", "this." + sym);
    }
    return text;
  }

  List<MatchResult> recorder;
  private void recordTo(List<MatchResult> fields) {
    recorder = fields;
  }

  private void buildComment(String text) {

    comments.clear();

    Pattern p = Pattern.compile("(?m)//.+$");
    Matcher matcher = p.matcher(text);

    while (matcher.find()) {
      comments.add(matcher.toMatchResult());
    }

    p = Pattern.compile("(?s)/\\*.+?\\*/");
    matcher = p.matcher(text);

    while (matcher.find()) {
      comments.add(matcher.toMatchResult());
    }

  }

  private String rplc(String text, String pattern, String replacement, int... groups) {
    buildComment(text);

    Pattern p = Pattern.compile(pattern);
    Matcher matcher = p.matcher(text);

    StringBuffer out = new StringBuffer();

    while (matcher.find()) {

      if (recorder != null) recorder.add(matcher.toMatchResult());

      if (isComment(matcher)) {
        continue;
      }

      String[] params = new String[groups.length];
      for (int i = 0; i < groups.length; i++) {
        params[i] = matcher.group(groups[i]);
      }
      matcher.appendReplacement(out, String.format(replacement, params));
    }
    matcher.appendTail(out);
    return out.toString();
  }

  private boolean isComment(MatchResult matcher) {
    for (MatchResult comment : comments) {
      if (matcher.start() >= comment.start() && matcher.start() < comment.end()) {
        return true;
      }
    }
    return false;
  }


  private String rplcParams(String text) {

    buildComment(text);

    Pattern p = Pattern.compile("this\\.[^\\(]+=\\s*function\\s*\\((.+)\\)");
    Matcher matcher = p.matcher(text);

    List<MatchResult> replacements = new ArrayList<>();

    while (matcher.find()) {
      replacements.add(matcher.toMatchResult());
    }

    Collections.reverse(replacements);

    int off = text.length();
    StringBuilder out = new StringBuilder();
    for (MatchResult m : replacements) {
      if (isComment(m)) continue;
      out.insert(0, text.substring(m.end(1), off));
      String sst = m.group();
      out.insert(0, sst.replaceAll("(?<![A-Za-z0-9_])(double|int)[\\[\\]]*\\s", ""));
      off = m.start();
    }

    out.insert(0, text.substring(0, off));
    return out.toString();
  }

  public static void main(String[] args) throws FileNotFoundException {
    new Java2JS().convert();
  }

}
