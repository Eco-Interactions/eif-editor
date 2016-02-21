(function() {
	console.log("scripts running")
	var idObj = {};          // appIds: {}
	var ein = ECO_INT_NAMESPACE;
	ein.jsmTstConfig = {
		saveId: saveId,
		writeFile: writeJSONfile
	};
	var toolbarBtnMap = {
    fileId: openFileCmd,
    folderId: openFolderCmd,
    writeJSON: saveFileCmd,
    runTests: launchTests
  }
  document.addEventListener("DOMContentLoaded", onDomLoaded);

  function onDomLoaded() {
		document.getElementById("toolbar").addEventListener("click", toolbarClickHandler);
	}

  function toolbarClickHandler(clickEvent) {		console.log("button clicked")
    var btnId = clickEvent.srcElement.localName === 'button' ? clickEvent.srcElement.id : 'not-button';
    if (btnId in toolbarBtnMap) { toolbarBtnMap[btnId](); };

	}

  function openFileCmd() {/* params,           idHandler,                Type   */
    ein.fileSys.selectFileSys(openFileParams(), ein.jsmTstConfig.saveId, "File");
  }

  function openFolderCmd() {/* params,           idHandler,                Type   */
    ein.fileSys.selectFileSys(openFolderParams(), ein.jsmTstConfig.saveId, "Folder");
  }

  function saveFileCmd() {/* file Text */
    ein.fileSys.fileSaveAs(writeJSONfile(idObj));
  }

  /* 'spaceHolder' is used to capture the FSysEntry being returned
		 from the fileSystem to allow type to come through.
  */
  function saveId(fSysId, spaceHolder, type) {
  	if (type === "Folder") {
  		idObj.appIds.folder = fSysId;				console.log("Folder", idObj.appIds.folder);
  	} else {
  		idObj.appIds.file = fSysId;					console.log("File", idObj.appIds.file);
  	}
  }

  function writeJSONfile(idObj) {
  	console.log(JSON.stringify(idObj, null, 2));
  	return "var progIdData = " + JSON.stringify(idObj);
  }

  function launchTests() {
    var width = 1100;
    var height = 600;
    var left = (screen.width/2)-(width/2);
    var top = (screen.height/2)-(height/2);
    chrome.app.window.create('jasmine/SpecRunner.html', {
      id: 'spec-win',
      outerBounds: { top: top, left: left, width: width, height: height }});
    delete ein.jsmTstConfig;
    window.close();
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
}());