(function(){
  var ein = ECO_INT_NAMESPACE;
  var curFiles = { open: false, appData: false, meta: {} };
  var curFileId;
  var msgRouter = { fileSysId: {}, responseObj: {} };
  var toolbarBtnMap = {
      openFile: openFileCmd,
      openFolder: openFolderCmd,
      saveFile: saveFileCmd,
      fileSaveAs: fileSaveAsCmd,
      reload: function () { chrome.runtime.reload(); },
      createFile: createFileCmd,
      createFolder: createFolderCmd,
      setUpTests: initTests,
      runTests: launchTests,
      csvParse: csvToObjectCmd,
      locParse: csvToLocObjsCmd,
      authParse: csvToAuthObjsCmd,
      pubParse: csvToPubObjsCmd
      // getLocal: function () { localCmd('getStorage') },
      // setLocal: function () { localCmd('setStorage', { ensoAppDataJsonFileId: "3BADF6A36530AE0EF1EA6B0F748F769E:enso/app-data.json" }) },
      // unsetLocal: function () { localCmd('unsetStorage', 'key'); console.log('unsetStorage localCmd sent'); },
      // clearDevLog: function () { devLogTxtArea.value = ''; },
      // logAppData: function () { ein.ui.devLog('appData', appData) },
      // getZartensRoot: function () { console.log('stub for getZartensRoot') },
    };
  document.addEventListener("DOMContentLoaded", onDomLoaded);

  /* onDomLoaded and it's helpers run after DOM-loaded code for local (outer window) */

  function onDomLoaded() {
    document.getElementById("toolbar").addEventListener("click", toolbarClickHandler);
  }

  /* ============================================================== */
  /* === Toolbar Command functions ================================ */
  /* ============================================================== */

  function toolbarClickHandler(clickEvent) {
    var btnId = clickEvent.srcElement.localName === 'button' ? clickEvent.srcElement.id : 'not-button';
    ein.ui.setStatus('Button Clicked. btnId=' + btnId);
    if (btnId in toolbarBtnMap) { toolbarBtnMap[btnId](); };
  }

  function openFileCmd() {/* params,           idHandler,                objHandler,        fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, ein.ui.show);
  }

  function openFolderCmd() {/* params,           idHandler,                 objHandler,             fileTxtHandler */
    ein.fileSys.selectFileSys(openFolderParams(), ein.fileSys.getFolderData, ein.fileSys.readFolder, ein.ui.devLog);
  }

  function saveFileCmd() {  console.log("saveFileCmd FileText", ECO_INT_NAMESPACE.editorTxtArea.value);
    ein.fileSys.saveFile(ein.ui.curFileId, ECO_INT_NAMESPACE.editorTxtArea.value);
  }

  function fileSaveAsCmd() {/*  file Text   */    console.log('fileSaveAsCmd fileText = ', ECO_INT_NAMESPACE.editorTxtArea.value);
    ein.fileSys.fileSaveAs(ECO_INT_NAMESPACE.editorTxtArea.value);
  }

  function createFileCmd() {  /*    ID,                                           writeHandler,            name,     callback                                                         fileText   */
    ein.fileSys.getFolderEntry("A06D490E460ABB3202AD3EEAD92D371C:Eco-Int_Editor", ein.fileSys.createFile, "Test", function(newFileId) { console.log('newFileId: %s', newFileId)}, "test content" );
  }

  function createFolderCmd() {  /*  ID,                                           writeHandler,             name,     callback          */
    ein.fileSys.getFolderEntry("A06D490E460ABB3202AD3EEAD92D371C:Eco-Int_Editor", ein.fileSys.createFolder, "Test", function(newFolderId) { console.log('newFolderId: %s', newFolderId)});
  }
/*---- Parse and show csv -------*/
  function csvToObjectCmd() {/* params,           idHandler,                 objHandler,      fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, getCSVObjsToShow);
  }
  function getCSVObjsToShow(fSysId, csvStr) {
    ein.csvHlpr.csvToObject(fSysId, csvStr, showCsvObjsInEditor);
  }
  function showCsvObjsInEditor(fSysId, csvObjAry) {
    ein.ui.show(fSysId, JSON.stringify(csvObjAry, null, 2));
  }
/*---- Parse and validate location csv -------*/
  function csvToLocObjsCmd() {/* params,           idHandler,                 objHandler,      fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, validateLocation);
  }
  function validateLocation(fSysId, text) {
    var result = {
      entityName: 'location'
    };
    ein.csvHlpr.csvToObject(fSysId, text, getLocCols, "interactions");

    function getLocCols(fSysId, recrdsAry) {
      ein.parse.extractCols(result.entityName, recrdsAry, collapseIdentLocs)
    }
    function collapseIdentLocs(resultObj) {
      result.unqField = resultObj.extractCols.unqField;
      result.extractdCols = resultObj.extractCols.extrctedCols;
      ein.parse.deDupIdenticalRcrds(resultObj.content, restructureLocRecords);
    }
    function restructureLocRecords(resultObj) {
      result.deDupRecrds = resultObj.duplicateResults;
      ein.parse.restructureRecrdObjs(resultObj.content, result.unqField, autoFillLocs);
    }
    function autoFillLocs(resultObj) {
      result.rcrdsWithNullUnqKeyField = resultObj.rcrdsWithNullUnqKeyField; // console.log("resultObj from dedup = %O. Result being built = %O", resultObj, result);
      ein.parse.autoFill(resultObj.content, validateLocRecs);
    }
    function validateLocRecs(resultObj) {    // console.log("resultObj = %O.", resultObj);
      result.autoFillResults = resultObj.autoFillResults;
      ein.parse.findConflicts(resultObj.content, showResultObj)
    }
    function showResultObj(resultObj) {
      if (resultObj.conflicts !== undefined) {
        result.conflicts = resultObj.conflicts;
      } else {
        result.conflicts = "No Conflicts Found.";
        result.finalRecords = resultObj.content;
      }                                                                  console.log("Final result = %O", result);
      ein.ui.show(fSysId, JSON.stringify(result,null,2));
    }
  }
/*---- Parse and validate authors csv -------*/
  function csvToAuthObjsCmd() {/* params,           idHandler,                 objHandler,      fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, validateAuths);
  }
  function validateAuths(fSysId, text) {
    var result = {
      entityName: 'author'
    };
    ein.csvHlpr.csvToObject(fSysId, text, ein.parse.parseChain, "authors");

    function showResultObj(resultObj) {                               console.log("Final result = %O", result);
      ein.ui.show(fSysId, JSON.stringify(result,null,2));
    }
  } /* End validateAuths */
/*---- Parse and validate publication csv -------*/
  function csvToPubObjsCmd() {/* params,           idHandler,                 objHandler,      fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, getCitCSVObj);
  }
  function getCitCSVObj(fSysId, text) {
    ein.csvHlpr.csvToObject(fSysId, text, validatePublication, "citations");
  }/* End validatePubs */
  function validatePublication(fSysId, recrdsAry) {
    var result = {
      entityName: 'publication'
    };
    ein.parse.parseChain(fSysId, recrdsAry, result.entityName);
  }

  function initTests() {
    var width = 900;
    var height = 300;
    var left = (screen.width/2)-(width/2);
    var top = (screen.height/2)-(height/2);
    chrome.app.window.create('jasmine/testEnv-init.html', {
    id: 'test-win',
      outerBounds: { top: top, left: left, width: width, height: height }});
  }

  function launchTests() {
    var width = 1100;
    var height = 600;
    var left = (screen.width/2)-(width/2);
    var top = (screen.height/2)-(height/2);
    chrome.app.window.create('jasmine/SpecRunner.html', {
      id: 'spec-win',
      outerBounds: { top: top, left: left, width: width, height: height }});
  }




/* =================== Build Params Packages ======================= */

  function openFileParams() {
    return {
      type: 'openFile',
      accepts: [{
        mimeTypes: ['text/*'],
        extensions: ['txt','js','css','csv','txt','html','json','svg','md']
      }],
      // acceptsAllTypes: true
    };
  }

  function openFolderParams() {
    return {type: 'openDirectory'};
  }

}());  /* end of namespacing anonymous function */


    // function collapseIdentAuths(fSysId, recrdsAry) {
    //   result.unqField = "ShortName";
    //   ein.parse.deDupIdenticalRcrds(recrdsAry, restructureAuthRecords);
    // }
    // function restructureAuthRecords(resultObj) {
    //   result.deDupRecrds = resultObj.duplicateResults;   console.log("restructureAuthRecords result = %O", result);
    //   result.deDupRecrds.hasDups ?
    //     ein.parse.restructureRecrdObjs(resultObj.content, result.unqField, autoFillAuths) :       //If there are no dupUnqKeys there is nothing to fill or validate currently
    //     ein.parse.restructureRecrdObjs(resultObj.content, result.unqField, showResultObj) ;
    // }
    // function autoFillAuths(resultObj) {
    //   result.rcrdsWithNullUnqKeyField = resultObj.rcrdsWithNullUnqKeyField || "No records with null unique fields";  console.log("resultObj from dedup = %O. Result being built = %O", resultObj, result);
    //   ein.parse.autoFill(resultObj.content, validateAuthRecs);
    // }
    // function validateAuthRecs(resultObj) {     console.log("validateAuthRecs. resultObj = %O.", resultObj);
    //   result.autoFillResults = resultObj.autoFillResults || "No records filled.";
    //   ein.parse.findConflicts(resultObj.content, showResultObj)
    // }
    //
    //
    // function getPubCols(fSysId, recrdsAry) {
    //   ein.parse.extractCols(result.entityName, recrdsAry, collapseIdentPubs)
    // }
    // function collapseIdentPubs(resultObj) {
    //   result.unqField = resultObj.extractCols.unqField;
    //   result.extractdCols = resultObj.extractCols.extrctedCols;
    //   ein.parse.deDupIdenticalRcrds(resultObj.content, restructurePubRecords);
    // }
    // function restructurePubRecords(resultObj) {
    //   result.deDupRecrds = resultObj.duplicateResults;   console.log("restructurePubRecords result = %O", result);
    //   result.deDupRecrds.hasDups ?
    //     ein.parse.restructureRecrdObjs(resultObj.content, result.unqField, autoFillPubs) :       //If there are no dupUnqKeys there is nothing to fill or validate currently
    //     ein.parse.restructureRecrdObjs(resultObj.content, result.unqField, showResultObj) ;
    // }
    // function autoFillPubs(resultObj) {
    //   result.rcrdsWithNullUnqKeyField = resultObj.rcrdsWithNullUnqKeyField;  console.log("resultObj from dedup = %O. Result being built = %O", resultObj, result);
    //   ein.parse.autoFill(resultObj.content, validatePubRecs);
    // }
    // function validatePubRecs(resultObj) {     console.log("validatePubRecs. resultObj = %O.", resultObj);
    //   result.autoFillResults = resultObj.autoFillResults;
    //   ein.parse.findConflicts(resultObj.content, showResultObj)
    // }
    // function showResultObj(resultObj) {
    //   if (resultObj.conflicts !== undefined) {
    //     result.conflicts = resultObj.conflicts;
    //   } else {
    //     result.conflicts = "No Conflicts Found.";
    //     result.finalRecords = resultObj.content;
    //   }                                                                  console.log("Final result = %O", result);
    //   ein.ui.show(fSysId, JSON.stringify(result,null,2));
    // }