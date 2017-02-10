import * as test from '../test'

export default {
  
  testVertCoi: function(env) {
    test.emptyModeller(env.test((win, app) => {
      app.actionManager.actions['BOX'].invoke(app);
      app.ui.registeredWizard.okClick();
      setSketch(win, app, '0:3', {"layers":[{"name":"sketch","data":[
        {"id":34,"_class":"TCAD.TWO.Segment","points":[[28,[29,-250],[30,250]],[31,[32,-169.15430109914888],[33,24.438723388262304]]],"children":[34]},
        {"id":41,"_class":"TCAD.TWO.Segment","points":[[35,[36,-169.15430109914888],[37,24.438723388262304]],[38,[39,-44.56473088447832],[40,170.1126824084925]]],"children":[41]},
        {"id":48,"_class":"TCAD.TWO.Segment","points":[[42,[43,-44.56473088447832],[44,170.1126824084925]],[45,[46,-250],[47,250]]],"children":[48]}]}]} );

      app.actionManager.actions['CUT'].invoke(app);
      app.ui.registeredWizard.okClick();
      assertScene(app, env, {"format":"LOOPS","vertices":[[-250,-250,-250],[-250,-250,250],[-250,24.438723388262304,-169.15430109914888],[-250,170.1126824084925,-44.56473088447832],[-250,250,-250],[-250,250,250],[-200,24.438723388262304,-169.15430109914888],[-200,170.1126824084925,-44.56473088447832],[-200,250,-250],[250,-250,-250],[250,-250,250],[250,250,-250],[250,250,250]],"faces":[[[9,10,1,0]],[[11,12,10,9]],[[4,5,12,11,8]],[[4,3,2,4,0,1,5]],[[5,1,10,12]],[[0,4,8,11,9]],[[4,2,6,8]],[[2,3,7,6]],[[3,4,8,7]],[[6,7,8]]]});
      env.done();
    }));
  },

  testMCUT_2ECUT_MCUT: function(env) {
    test.emptyModeller(env.test((win, app) => {
      app.actionManager.actions['BOX'].invoke(app);
      app.ui.registeredWizard.okClick();
      setSketch(win, app, '0:2', {"layers":[{"name":"sketch","data":[{"id":62,"_class":"TCAD.TWO.Segment","points":[[56,[57,-148.94075535101177],[58,173.69055445978523]],[59,[60,154.2442837314632],[61,173.69055445978523]]],"children":[62]},{"id":69,"_class":"TCAD.TWO.Segment","points":[[63,[64,154.2442837314632],[65,173.69055445978523]],[66,[67,154.2442837314632],[68,-17.236467236467238]]],"children":[69]},{"id":76,"_class":"TCAD.TWO.Segment","points":[[70,[71,154.2442837314632],[72,-17.236467236467238]],[73,[74,-148.94075535101177],[75,-17.236467236467238]]],"children":[76]},{"id":83,"_class":"TCAD.TWO.Segment","points":[[77,[78,-148.94075535101177],[79,-17.236467236467238]],[80,[81,-148.94075535101177],[82,173.69055445978523]]],"children":[83]}]}]} );
      cut(app, '0:2', 500);
      setSketch(win, app, '0:1', {"layers":[{"name":"sketch","data":[{"id":48,"_class":"TCAD.TWO.Segment","points":[[42,[43,250],[44,250]],[45,[46,45.42896723585416],[47,250]]],"children":[48]},{"id":55,"_class":"TCAD.TWO.Segment","points":[[49,[50,45.42896723585416],[51,250]],[52,[53,45.42896723585416],[54,57.176503480539594]]],"children":[55]},{"id":62,"_class":"TCAD.TWO.Segment","points":[[56,[57,45.42896723585416],[58,57.176503480539594]],[59,[60,250],[61,57.176503480539594]]],"children":[62]},{"id":69,"_class":"TCAD.TWO.Segment","points":[[63,[64,250],[65,57.176503480539594]],[66,[67,250],[68,250]]],"children":[69]}]}]});
      cut(app, '0:1', 500);
      setSketch(win, app, '2:0', {"layers":[{"name":"sketch","data":[{"id":55,"_class":"TCAD.TWO.Segment","points":[[49,[50,-379.56770796200084],[51,-40.45650878155793]],[52,[53,-5.818373610536707],[54,-40.45650878155793]]],"children":[55]},{"id":62,"_class":"TCAD.TWO.Segment","points":[[56,[57,-5.818373610536707],[58,-40.45650878155793]],[59,[60,-5.818373610536707],[61,-354.50976889632983]]],"children":[62]},{"id":69,"_class":"TCAD.TWO.Segment","points":[[63,[64,-5.818373610536707],[65,-354.50976889632983]],[66,[67,-379.56770796200084],[68,-354.50976889632983]]],"children":[69]},{"id":76,"_class":"TCAD.TWO.Segment","points":[[70,[71,-379.56770796200084],[72,-354.50976889632983]],[73,[74,-379.56770796200084],[75,-40.45650878155793]]],"children":[76]}]}]});
      cut(app, '2:0', 50);
      //assertScene(app, env, {"format":"LOOPS","vertices":[[-250,-250,-250],[-250,-250,250],[-250,24.438723388262304,-169.15430109914888],[-250,170.1126824084925,-44.56473088447832],[-250,250,-250],[-250,250,250],[-200,24.438723388262304,-169.15430109914888],[-200,170.1126824084925,-44.56473088447832],[-200,250,-250],[250,-250,-250],[250,-250,250],[250,250,-250],[250,250,250]],"faces":[[[9,10,1,0]],[[11,12,10,9]],[[4,5,12,11,8]],[[4,3,2,4,0,1,5]],[[5,1,10,12]],[[0,4,8,11,9]],[[4,2,6,8]],[[2,3,7,6]],[[3,4,8,7]],[[6,7,8]]]});
      env.done();
    }));
  }
};

function cut(app, faceId, depth) {
  selectFace(app, faceId);
  app.actionManager.actions['CUT'].invoke(app);
  app.ui.registeredWizard.setFormField('value', depth);
  app.ui.registeredWizard.okClick();
}

function setSketch(win, app, faceId, data) {
  win.localStorage.setItem(app.faceStorageKey(faceId), JSON.stringify(data));
  app.refreshSketches();
}

function selectFace(app, faceId) {
  app.viewer.selectionMgr.select(app.findFace(faceId));
}

function assertScene(app, env, expected) {
  env.assertData(expected, app.TPI.brep.IO.toLoops(app.craft.solids[0].shell));
}