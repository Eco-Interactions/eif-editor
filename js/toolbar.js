(function(){
  var ein = ECO_INT_NAMESPACE;
  var curFiles = { open: false, appData: false, meta: {} };
  var msgRouter = { fileSysId: {}, responseObj: {} };
  var toolbarBtnMap = {
      openFile: openFileCmd,
      openFolder: openFolderCmd,
      saveFile: saveFileCmd,
      reload: function () { chrome.runtime.reload(); },
      getLocal: function () { localCmd('getStorage') },
      setLocal: function () { localCmd('setStorage', { ensoAppDataJsonFileId: "3BADF6A36530AE0EF1EA6B0F748F769E:enso/app-data.json" }) },
      unsetLocal: function () { localCmd('unsetStorage', 'key'); console.log('unsetStorage localCmd sent'); },
      clearDevLog: function () { devLogTxtArea.value = ''; },
      logAppData: function () { ein.ui.devLog('appData', appData) },
      getZartensRoot: function () { console.log('stub for getZartensRoot') },
      createTestFolder: createTestFolderCmd
    };
  document.addEventListener("DOMContentLoaded", onDomLoaded);

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
    ein.fileSys.getFileSysId(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, ein.ui.show);
  }

  function openFolderCmd() {/* params,           idHandler,                    objHandler,           fileTxtHandler */
    ein.fileSys.getFileSysId(openFolderParams(), ein.fileSys.getFolderData, ein.fileSys.readFolder, ein.ui.show);
  }










  function saveFileCmd() {
    codeMirrorObj.save();
    localWin.postMessage(savePkg(curFiles.open, editorTxtArea.value), '*');
  }

  function createTestFolderCmd() {
    var newFilePkg =  {
        cmd: 'createFolder',
        params: {
          fSysId: 'D847F49FAB46E7921D7406B085DDAFD3:ardZart',
          fileText: '',
          name: 'Test'
        }
      };
    localWin.postMessage(newFilePkg, '*');
  }


/* =================== Local API Access (postMsg) ======================= */

  function savePkg(fileId, fileContent) {
    return {
      cmd: 'saveFile',
      params: {
        fSysId: fileId,
        fileText: fileContent }
    };
  }

/* =================== Zartens UI Behaviors (self-contained) ======================= */


}());  /* end of namespacing anonymous function */
