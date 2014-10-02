package cad;

import cad.gcs.Constraint;
import cad.gcs.GlobalSolver;
import cad.gcs.Param;
import cad.gcs.Solver;
import cad.gcs.constr.Equal;
import cad.gcs.constr.EqualsTo;
import cad.gcs.constr.P2LDistance;
import cad.gcs.constr.Parallel;
import cad.gcs.constr.Perpendicular;
import gnu.trove.map.TIntObjectMap;
import gnu.trove.map.hash.TIntObjectHashMap;
import jdk.nashorn.internal.parser.JSONParser;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.json.JSONArray;
import org.json.JSONObject;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class SolveServer {

  public static void main(String[] args) throws Exception {
    Server server = new Server(8080);

    HandlerList handlers = new HandlerList();
    handlers.addHandler(new SolveHandler());

    ResourceHandler rh = new ResourceHandler();
    rh.setDirectoriesListed(true);
    rh.setResourceBase("/home/verastov/Dropbox/project/cadit/web");
    handlers.addHandler(rh);

    server.setHandler(handlers);
    server.start();
//    server.dumpStdErr();
    server.join();
  }
}

class SolveHandler extends AbstractHandler {

  public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {

    if (!request.getRequestURI().startsWith("/solve")) {
      return;
    }

    BufferedReader reader = request.getReader();
    String jsonStr = new Scanner(reader).useDelimiter("\\A").next();
    System.out.println("REQUEST: " + jsonStr);

    JSONObject json = new JSONObject(jsonStr);

    JSONObject solved = solve(json);
    System.out.println("RESPONSE: " + solved);

    response.setContentType("application/json;charset=utf-8");
    response.setStatus(HttpServletResponse.SC_OK);
    baseRequest.setHandled(true);

    response.getWriter().println(solved.toString());
  }

  private JSONObject solve(JSONObject req) {
    List<Constraint> constraints = new ArrayList<>();
    JSONObject system = req.getJSONObject("system");
    JSONArray params = system.getJSONArray("params");
    JSONArray constrs = system.getJSONArray("constraints");
    JSONArray locked = system.getJSONArray("locked");

//    TIntObjectMap<Param> paramsDict = new TIntObjectHashMap();
    List<Param> paramsDict = new ArrayList<>(params.length());
    for (int i = 0; i < params.length(); i++) {
      paramsDict.add(null);
    }
    class ParamHelper {
      private JSONArray refs;
      public Param get(int pos) {
        int ref = refs.getInt(pos);
        Param param = paramsDict.get(ref);
        if (param == null) {
          param = new Param(params.getDouble(ref));
          paramsDict.set(ref, param);
        }
        return param;
      }
    }

    ParamHelper h = new ParamHelper();

    for (int i = 0; i < constrs.length(); i++) {
      JSONArray constr = constrs.getJSONArray(i);
      String functional = constr.getString(0);
      h.refs = constr.getJSONArray(1);
      JSONArray constants = constr.getJSONArray(2);

      switch (functional) {
        case "equal":
          constraints.add(new Equal(h.get(0), h.get(1)));
          break;
        case "perpendicular":
          constraints.add(new Perpendicular(h.get(0), h.get(1), h.get(2), h.get(3), h.get(4), h.get(5), h.get(6), h.get(7)));
          break;
        case "parallel":
          constraints.add(new Parallel(h.get(0), h.get(1), h.get(2), h.get(3), h.get(4), h.get(5), h.get(6), h.get(7)));
          break;
        case "P2LDistance":
          constraints.add(new P2LDistance(constants.getDouble(0), h.get(0), h.get(1), h.get(2), h.get(3), h.get(4), h.get(5)));
          break;
      }
    }

    for (int i = 0; i < locked.length(); i++) {
      Param param = paramsDict.get(locked.getInt(i));
//      param.setLocked(true);
      constraints.add(new EqualsTo(param, param.get()));
    }

    Solver.SubSystem subSystem = new Solver.SubSystem(constraints);
    GlobalSolver.globalSolve(subSystem, () -> {});


    JSONObject response = new JSONObject();
    response.put("reqId", req.getInt("reqId"));
    JSONArray paramsJson = new JSONArray();
    response.put("params", paramsJson);
    for (Param param : paramsDict) {
      paramsJson.put(param.get());
    }
    return response;
  }
}