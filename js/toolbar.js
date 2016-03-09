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
      csvParse: csvToObjectCmd
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

  function csvToObjectCmd() {/* params,           idHandler,                 objHandler,         fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, ein.parse.csvObjWrapper);
  }

  function csvToObjectCmd() {/* params,           idHandler,                 objHandler,      fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, validateLocation);
  }

  function validateLocation(fSysId, text) {
    var result = {
      entityName: 'location'
    }
    ein.csvHlpr.csvToObject(fSysId, text, getLocCols);

    function getLocCols(fSYsId, recrdsAry) {
      ein.parse.extractCols(result.entityName, recrdsAry, collapseIdentLocs)
    }
    function collapseIdentLocs(resultObj) {
      result.unqField = resultObj.extractCols.unqField;
      result.extractdCols = resultObj.extractCols.extrctedCols;
      ein.parse.deDupIdenticalRcrds(resultObj.extractCols.content, restructureRecrdObjs);
    }
    function restructureRecrdObjs(resultObj) {
      result.identRecrds = resultObj.duplicateResults;  console.log("resultObj from dedup = %O. Result being built = %O", resultObj, result);
    }
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
        extensions: ['js', 'css', 'txt', 'html', 'json', 'svg', 'md']
      }]
    };
  }

  function openFolderParams() {
    return {type: 'openDirectory'};
  }

}());  /* end of namespacing anonymous function */
