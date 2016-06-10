(function(){
  var progBar, boundPopUpAlert, overlay, popupBtn, webviewElem, webviewCntnr, boundPopUpMsg, loginTimeoutId, jsonResultsObj;
  var ein = ECO_INT_NAMESPACE;
  /**
   * Attached methods at ein.tools.
   *   setProgress: boundSetProgress
   *   clearProgress: clearProgStatus
   */
  ein.tools = {
      clearProgress: clearProgStatus,
  };
  /**Routes toolbar button clicks to their corresponding method. */
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
      fileParse: selectFileCsvParse,
      csvSet: selectCSVDataSetParse,
      allFileSet: csvFileSetParse,
      jsonSave: saveJsonResults,
      pushEnt: pushEntity,
      login: webviewLogin
  };
  /**
   * Entities to be parsed for each collection.
   * Index 0 = parent dataSet, then children in the order which they will be parsed.
   */
  var entityCsvParseVals = {   
    author: ["author"],
    citation: ["citation", "publication"],
    interaction: ["interaction", "location"],
    interactionSet: ["interaction", "citation", "author"],
    citationSet: ["citation", "author"],
  };
  /**
   * Status bar messages for notable stages in the parse and validation process. 
   */
  var statusMsgDict = {
     2: " - Load file set",                       63: " - Validating Author entity",
    16: " - Finding files",                       68: " - Validating Citation entity",
    25: " - Reading Author file",                 75: " - Validating Publication entity",
    30: " - Parsing Author CSV",                  80: " - Validating Interaction entity",
    35: " - Reading Citation file",               87: " - Validating Location entity",
    40: " - Parsing Citation CSV",                93: " - Merging Citation data set",
    45: " - Reading Interaction file",            96: " - Merging Interaction data set",
    50: " - Parsing Interaction CSV",             98: " - Displaying validation results", // report shown
    55: " - Begin validation",                    99: " - Displaying data grid",          // grid shown
    58: " - Validating file set",                100: ""
  };
  /**
   * Routes data from a recieved message to its corresponding response method.
   * Keys are tags received in the message's data package and correspond to 
   * the appropriate response methods. 
   */
  var msgMap = {
    webviewInitComplete: showWebview,
    loginRole: checkRole,
    reLogin: loginAgain,
    adminLogin: hideWebview
  };

  document.addEventListener("DOMContentLoaded", onDomLoaded);

  window.addEventListener('message', webviewMsgHandlr, false);
  /**
   * Grab DOM elements, init bound functions, and toolbar listener.
   */
  function onDomLoaded() {
    overlay = document.getElementById("overlay");
    popup = document.getElementById("popUpDiv");
    popupBtn = document.getElementById("popupclose");
    progBar = document.getElementById("progBar"); //console.log(progBar);
    ein.tools.setProgress = boundSetProgress = setProgressStatus.bind(null, progBar);
    boundPopUpAlert = alertPopUp.bind(null, overlay, popup);
    boundPopUpMsg = msgPopUp.bind(null, overlay, popup);
    document.getElementById("toolbar").addEventListener("click", toolbarClickHandler);
  }
/*------------------Toolbar Command functions---------------------------------*/
  /**
   * Routes toolbar button clicks to their corresponding method via the toolbarBtnMap object.
   */
  function toolbarClickHandler(clickEvent) {
    var btnId = clickEvent.srcElement.localName === 'button' ? clickEvent.srcElement.id : 'not-button';
    if (btnId in toolbarBtnMap) { toolbarBtnMap[btnId](); };
  }
  function openFileCmd() {/* params,           idHandler,                objHandler,        fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, ein.ui.show);
  }
  function openFolderCmd() {/* params,           idHandler,                 objHandler,             fileTxtHandler */
    ein.fileSys.selectFileSys(openFolderParams(), ein.fileSys.getFolderData, ein.fileSys.readFolder, ein.ui.devLog);
  }
  function saveFileCmd() {  //console.log("saveFileCmd FileText", ECO_INT_NAMESPACE.editorTxtArea.value);
    ein.fileSys.saveFile(ein.ui.curFileId, ECO_INT_NAMESPACE.editorTxtArea.value);
  }
  function fileSaveAsCmd() {/*  file Text   */   // console.log('fileSaveAsCmd fileText = ', ECO_INT_NAMESPACE.editorTxtArea.value);
    ein.fileSys.fileSaveAs(ECO_INT_NAMESPACE.editorTxtArea.value);
  }
  function createFileCmd() {  /*    ID,                                           writeHandler,            name,     callback                                                         fileText   */
    ein.fileSys.getFolderEntry("A06D490E460ABB3202AD3EEAD92D371C:Eco-Int_Editor", ein.fileSys.createFile, "Test", function(newFileId) { console.log('newFileId: %s', newFileId)}, "test content" );
  }
  function createFolderCmd() {  /*  ID,                                           writeHandler,             name,     callback          */
    ein.fileSys.getFolderEntry("A06D490E460ABB3202AD3EEAD92D371C:Eco-Int_Editor", ein.fileSys.createFolder, "Test", function(newFolderId) { console.log('newFolderId: %s', newFolderId)});
  }
  /**
   * Button appears when validated data has been successfully parsed and stored in the jsonResultsObj. 
   */
  function saveJsonResults() {
    ein.fileSys.fileSaveAs(jsonResultsObj)
  }
  /*---------------------Progress Bar and Status Methods--------------------------*/
  /** Sets percentage on the progress bar and updates the status message. */
  function setProgressStatus(barElem, percent) {                                // console.log("setProgress to %s\%", percent)
    var status = percent.toString() + '%' + statusMsgDict[percent];
    barElem.value = percent;
    ein.ui.setStatus(status);
  }
  /**
   * Clears progress bar and, optionally, set's a final status message.
   */
  function clearProgStatus(statusMsg) {
    var status = statusMsg || "";
    document.getElementById('progBar').className = 'fade-out';
    ein.ui.setStatus(status);
    setTimeout(function(){document.getElementById('progBar').className = 'hidden'}, 1000);
  }
/*-------------PopUp Methods--------------------------------------------------*/
  /** Creates popup message that closes both the popup and the overlay element. */
  function alertPopUp(overlay, popup, contnt, status) {                         //    console.log("alertPopUp contnt = ", contnt)
      popup.firstElementChild.innerHTML = contnt;
      overlay.style.display = 'block';
      popup.style.display = 'block';                                            //  console.log("popup.firstChild = %O", popup)
      if (status !== undefined) { ein.ui.setStatus(status); }
      popupBtn.onclick = hideOverlayAndPopup;  
  }
  function hideOverlayAndPopup(status) {
      popup.style.display = 'none';
      overlay.style.display = 'none';
      if (status !== undefined) { ein.ui.setStatus(status) }
  }
  /** Creates popup message that closes independently of the overlay element. */
  function msgPopUp(overlay, popup, contnt, status) {                           //   console.log("popUp contnt = ", contnt)
      popup.firstElementChild.innerHTML = contnt;
      overlay.style.display = 'block';
      popup.style.display = 'block';
      popupBtn.onclick = hidePopUp; 
      if (status !== undefined) { ein.ui.setStatus(status); }
  }
  function hidePopUp(status) {
      popup.style.display = 'none';
      popupBtn.style.display = 'block';
      if (status !== undefined) { ein.ui.setStatus(status) }
  }
  /*--------------------- Login with Webview ---------------------------------*/
  function webviewLogin(data, name) {                                           // console.log("webviewLogin begun.")
    webviewElem = buildWebview();
    popupBtn.style.display = 'none';
    boundPopUpMsg('Initiating connection with batplant.org', 'Connecting to batplant.org');
    webviewElem.addEventListener('contentload', postWebviewInitMsg);
  } /* End webviewLogin */
  function postWebviewInitMsg() {
    webviewElem.contentWindow.postMessage({tag: "init"}, "http://localhost/batei/web/app_dev.php/login");
  }
  function hideWebview() {
    webviewCntnr.style.display = "none";
  }
  function buildWebview() {
    webviewCntnr = document.createElement("div");
    webviewCntnr.id = 'web-view-cntnr';
    webviewCntnr.innerHTML = '<webview id="web-view" src="http://localhost/batei/web/login" style="width:100%; height:85%"></webview>';
    webviewCntnr.style.display = 'none';
    overlay.appendChild(webviewCntnr);
    return document.getElementById('web-view');
  }
  function webviewMsgHandlr(msg) { console.log('message recieved in toolbar. =%O', msg);
    msgMap[msg.data.tag](msg.data);
  }
  /** Show batplant login page and prepare for login messaging. */
  function showWebview(msgData) {
    hidePopUp('Please login to batplant.org.');
    overlay.style.display = "block";
    webviewCntnr.style.display = 'block';
    webviewElem.addEventListener('loadstart', function(){ overlay.style.opacity = ".3"; });
    webviewElem.addEventListener('contentload', checkLogin);
  }
/*----------------Login and Admin Specific Methods----------------------------*/
  function checkRole(msgData) {                                                 //   console.log("checkRole called. msgData= %O", msgData);
    webviewElem.removeEventListener('contentload', postWebviewInitMsg);    
    webviewElem.removeEventListener('contentload', checkLogin);
    hideWebview();
    if (msgData.role === "admin" || msgData.role === "super") {
      adminLogin(msgData);
    } else {
      invalidRole();
    }
  }
  function checkLogin() { console.log("checkLogin called. ")
    webviewElem.contentWindow.postMessage({tag: "loginRole"}, "http://localhost/batplant/web/");
  }
  function loginAgain() {
    overlay.style.opacity = "1";
    boundPopUpMsg("<h2>Something went wrong.</h2><h4>Please try logging in again.</h4>", "Please try logging in again.");
  }
  function invalidRole() { console.log("invalidRole called");
    boundPopUpAlert("<br><p>You should not be here.</p><p>You do not have access.</p><p>You must go.</p><p>Now.", "Invalid credentials.");
  }
  function adminLogin(msgData) {  console.log("hideWebview called. ")
    hideOverlayAndPopup("Successful login.");
    clearProgStatus();
    showAdminElems();
    document.getElementById("username").innerText = "Logged in as " + msgData.user;
    document.getElementById("login").style.display = "none";
  }
  function showAdminElems () {
    var adminElems = document.getElementsByClassName('admin-only');  console.log("adminElems = %O", adminElems);
    for (var i=0; i < adminElems.length; i++) {
      adminElems[i].className= "admin-only";
    }
  }
  /*--------------------- Push Valid Entity Objs -------------------------------------------*/
  /**
   * Prompts user to select a json file containing validated json results. @pushJsonResults
   */
  function pushEntity () { console.log("pushEntity called.")
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, pushJsonResults)
    /**
     * Sends validated record objs to batplant.org.
     */
    function pushJsonResults(fSysId, jsonResults) {  console.log("jsonResults = %O", JSON.parse(jsonResults));
      webviewElem.contentWindow.postMessage({
        tag: 'uploadData',
        data: { 'jsonData': jsonResults }},
        "http://localhost/batplant/web/"
      );
    }
  } /* End pushEntity */
/*--------------------Helper Methods--------------------------------------------------------*/
  /**
   *  Valid only mode will show a validation report if there were any errors in the data,
   *  otherwise only records that had no issues will be loaded in the data grid. 
   */
  function isValidOnlyMode() {
    var valChkbxElem = document.getElementById('loadIfValid');
    return valChkbxElem.checked ? true : false;
    // return true;
  }   
  /**
    * A wrapper to place single entity validation results in the format reporting expects.
    */
    function singleEntityValDisplay(fSysIdAry, resultData) {                     
      var displayObj = {};
      displayObj[resultData.name] = resultData;
      ein.errReport(fSysIdAry, displayObj);
    }
/*--------------Interaction File Set Parsing--------(CURRENT MAIN PARSE METHODS)--------------------------------------*/
  /**
   * User selects folder with exactly 3 csv files (with author, citation and interaction in their file names). These files are turned into
   * record objects representing each entity and their valid data from the files. In 'valid mode' a report is generated deescribing any
   * errors in the validation process. If there were no errors, or not in 'valid mode', valid data is loaded into a data grid in the editor.
   */
  function csvFileSetParse() {                                                  // console.log("csvFileSetParse called");
    var curProg = 20;
    var fileNameStrngs = ["interaction", "citation", "author"];
    var fileObjs = {
      author: {},
      citation: {},
      interaction: {}
    };
    document.getElementById('progBar').className = 'fade-in';
                               /* params,        idHandler,                 objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFolderParams(), ein.fileSys.getFolderData, ein.fileSys.readFolder, getCsvFiles);
    boundSetProgress(2);

    function getCsvFiles(pathStr, folderMap) {                                //Grab files with .csv extensions
      boundSetProgress(16);
      var fileSetIds = getCsvFileIds(folderMap); //  console.log("fileSetIds = %O", fileSetIds)
      if ( fileSetIds.length === 3 ) { validateFileSet(fileSetIds); }
        else {
          boundPopUpAlert("<h3>There are " + (fileSetIds.length > 3 ? "more" : "less") + " than 3 .csv files in this folder.</h3>");
          clearProgStatus();
        }
    }
    function getCsvFileIds(folderMap) {//  console.log("getCsvFileIds called. folderMap = %O", folderMap);
      var csvFileIds = [];
      var fileKeys = Object.keys(folderMap.files);
      fileKeys.forEach(function(fileKey) {
        var splitFile = folderMap.files[fileKey].id.split('.');
        var extension = splitFile[splitFile.length - 1];
        if (extension === "csv") { csvFileIds.push(folderMap.files[fileKey].id); }
      }); //  console.log("csvFileIds  = %O", csvFileIds)
      return csvFileIds;
    }
    function validateFileSet(fileSetIds) {    //     console.log("validateFileSet called = %O", fileSetIds)
      var invalidFileId, unmatched;
      var validFileSet = fileSetIds.every(function(fileId) {
        return validFileNameCheck(fileId);
      });
      if (validFileSet) { openFiles();
      } else {
        boundPopUpAlert('<h3>Invalid file name: "' + invalidFileId[1] + '".</h3>' +
          'Please use a file name with a csv extension and author, citation, or interaction in the file name.');
          clearProgStatus();
      }

      function validFileNameCheck(fileId) { // console.log("validFileNameCheck called.");
        if (ifValidFileName(fileId)) { return true;
        } else {
          invalidFileId = fileId.split("/");  //  console.log("invalidFileId = ", invalidFileId)
          return false;
        }
      }
    } /* End validateFileSet */
    function ifValidFileName(fileId) { // console.log("ifValidFileName called.");
      var validFileName = fileNameStrngs.some(function(fileNameStr) { return ifStrInFileName(fileNameStr); });
      // console.log("validFileName = ", validFileName);
      return validFileName;

      function ifStrInFileName(fileNameStr) {
        var capsFileNameStr = fileNameStr.toUpperCase();
        var capsFileId = fileId.toUpperCase();
        if (capsFileId.search(capsFileNameStr) !== -1) {
          fileObjs[fileNameStr].fileId = fileId;
          return true;
        }
      }
    } /* End ifValidFileName */
    function openFiles() {
      var curFile = fileNameStrngs.pop();
      curProg = curProg + 5;
      boundSetProgress(curProg);      //  console.log("openFile %s. curProg = ", curFile, curProg);
      if (curFile === undefined) {
        parseAllRecrdObjs(curProg)
      } else {
        ein.fileSys.entryFromId(fileObjs[curFile].fileId, ein.fileSys.getFileObj, ein.fileSys.readFile, objectifyCSV) ;
      }

      function objectifyCSV(fSysId, fileText) {
        curProg = curProg + 5;       //   console.log("objectifyCSV called. curProg = ", curProg);
        boundSetProgress(curProg);
        ein.csvHlpr.csvToObject(fSysId, fileText, storeCsvObj, curFile);
      }
    } /* End openFiles*/
    function storeCsvObj(fSysId, rcrdAryObjs, topEntity, errors) {
      if (errors) { boundPopUpAlert(errors); clearProgStatus(); return false; }
      fileObjs[topEntity].orgRcrdAryObjs = rcrdAryObjs;
      openFiles();
    }
    function parseAllRecrdObjs(curProg) {      //   console.log("parseAllRecrdObjs curProg= ", curProg);
      var validMode = isValidOnlyMode();
      var cb = validMode === true ? ein.errReport : buildDataGridConfig;

      curProg = curProg + 3;        //    console.log("parseAllRecrdObjs called. curProg = ", curProg);
      boundSetProgress(curProg);

      ein.parse.parseFileSet(fileObjs, validMode, cb);
    }
  }/* End csvFileSetParse */
  /**
   * Loads the final validated records collection into the data grid.
   */
  function buildDataGridConfig(fSysIdAry, recrdsMetaData) {
    boundSetProgress(99);
    ein.dataGrid.buildConfig(recrdsMetaData.finalRecords, loadDataGrid);
  }
  function loadDataGrid(gridConfig) {
    ein.editorTxtArea.className = "hidden";

    agGridGlobalFunc('#grid-cntnr', gridConfig);

    boundSetProgress(100);
    setTimeout(clearProgStatus, 3000);
  }
/*----------Select entity to parse-------------- */
  function selectFileCsvParse() {
    var entity = document.getElementById('entitySelect').value;
    var entitiesInFile = entityCsvParseVals[entity];
    var dataSet = entityCsvParseVals[entity][0];
                                   /* params,      idHandler,            objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);

    function csvToObjForEntity(fSysId, text) {
      ein.csvHlpr.csvToObject(fSysId, text, validateEntity, dataSet);
    }
    function validateEntity(fSysId, recrdsAry) {
      var validMode = isValidOnlyMode();
      var childObjs = [];
      var parentObj = {};
      var resultData = {};

      entitiesInFile.forEach(function(entity) {
        ein.parse.parseChain(fSysId, recrdsAry, entity, storeResults, validMode);
      });
      mergeEntities();

      function mergeEntities() { //console.log("childObjs = %O,  parentObj = %O", childObjs, parentObj);
        var cb = validMode ? ein.errReport : entity === "interaction" ? buildDataGridConfig : ein.ui.show;
        var valObj = validMode ? mergeEntityResults() : false;
        ein.parse.mergeDataSet(fSysId, parentObj, childObjs, cb, valObj);
      }
      function storeResults(fSysId, resultData) {
        if (resultData.name === entity) { parentObj = resultData;
        } else { childObjs.push(resultData); }
      }
      function mergeEntityResults() {
        var obj = {};
        obj[parentObj.name] = parentObj;
        childObjs.forEach(function(child) { obj[child.name] = child; });
        return obj;
      }
    } /* End validateEntity */
  } /* End selectFileCsvParse */
/*----------Select Data Set to parse-------------- */
  function selectCSVDataSetParse() {
    var curTopEntity, outerDataObj, entitiesInFile;
    var outerEntity = false;
    var fSysIdAry = [];
    var subEntityObjAry = [];
    var dataSet = document.getElementById('dataSetSelect').value;                   console.log("selectCSVDataSetParse called.  dataSet = ", dataSet);
    var paramTopEntitiesAry = entityCsvParseVals[dataSet];

    parseEachTopEntity();

    function parseEachTopEntity() {                                                 console.log("parseEachTopEntity called.");
      outerEntity !== false ? mergeEntitiesIntoDataObj() : processTopEntity();
    }
    function processTopEntity() {
      curTopEntity = paramTopEntitiesAry.pop();                                     console.log("curTopEntity = ", curTopEntity);
      entitiesInFile = entityCsvParseVals[curTopEntity].reverse();                  console.log("entitiesInFile = %O", entitiesInFile); // Reverse so top entity is the last entity ro be parsed, triggering the next top entity parsing
      outerEntity = paramTopEntitiesAry.length === 0 ? curTopEntity : false;        console.log("outerEntity = ", outerEntity);
      openEntityFile();
    }
    function openEntityFile() {/* params,             idHandler,            objHandler,          fileTxtHandler */
      ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);
    }
    function csvToObjForEntity(fSysId, text) {                                      console.log("csvToObjForEntity called.");
      fSysIdAry.push(fSysId);                                                       console.log("curTopEntity inside = ", curTopEntity);
      ein.csvHlpr.csvToObject(fSysId, text, forEachEntityInFile, curTopEntity);
    }
    function forEachEntityInFile(fSysId, orgRcrdAryObjs, topEntity) {               console.log("forEachEntityInFile called. arguments = %O", arguments);
      entitiesInFile.forEach(function(parseEntity) {                                console.log("forEachEntityInFile called. parseEntity = ", parseEntity);
        ein.parse.parseChain(fSysId, orgRcrdAryObjs, parseEntity, storeParsedEntityRecords);
      });
      function storeParsedEntityRecords(fSysId, recrdsObj) {                        console.log("storeParsedEntityRecords called. arguments = %O", arguments);
        if (outerEntity === recrdsObj.name) {                                       console.log("storeParsedEntityRecords called. isOuterEntity true. recrdsObj = %O", recrdsObj);
          outerDataObj = recrdsObj;
        } else {                                                                    console.log("forEachEntityInFile called on subEntity");
          subEntityObjAry.push(recrdsObj);
        }
        if (recrdsObj.name === topEntity) { parseEachTopEntity(); }
      }
    } /* End forEachEntityInFile */
    function mergeEntitiesIntoDataObj() {                                           console.log("mergeEntitiesIntoDataObj called. outerDataObj = %O,  subEntityObjAry = %O", outerDataObj, subEntityObjAry);
      ein.parse.mergeDataSet(fSysIdAry, outerDataObj, subEntityObjAry);
    }
  }/* End selectCSVDataSetParse */
  /*----------Interaction Data Set parsing-------------- */
  function csvInteractionDataSetParse() {
    var curTopEntity, citDataObj, intDataObj, entitiesInFile;
    var outerEntity = false;
    var fSysIdAry = [];
    var subEntityObjAry = [];
    var dataSet = "interactionSet";                                                 console.log("csvInteractionDataSetParse called.  dataSet = ", dataSet);
    var paramTopSubEntitiesAry = entityCsvParseVals[dataSet];

    processTopEntities();

    function processTopEntities() {
      curTopEntity = paramTopSubEntitiesAry.pop();                                  console.log("Open file for curTopEntity = ", curTopEntity);
      entitiesInFile = entityCsvParseVals[curTopEntity].reverse();                  console.log("entitiesInFile = %O", entitiesInFile); // Reverse so top entity is the last entity ro be parsed, triggering the next top entity parsing
      openEntityFile();
    }
    function openEntityFile() {/* params,             idHandler,            objHandler,          fileTxtHandler */
      ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);
    }
    function csvToObjForEntity(fSysId, text) {                                      console.log("csvToObjForEntity called.");
      fSysIdAry.push(fSysId);
      ein.csvHlpr.csvToObject(fSysId, text, forEachEntityInFile, curTopEntity);
    }
    function forEachEntityInFile(fSysId, orgRcrdAryObjs, topEntity) {               console.log("forEachEntityInFile first called. arguments = %O", arguments);
      entitiesInFile.forEach(function(parseEntity) {                                console.log("forEachEntityInFile parsing = ", parseEntity);
        ein.parse.parseChain(fSysId, orgRcrdAryObjs, parseEntity, storeParsedEntityRecords);
      });
      function storeParsedEntityRecords(fSysId, recrdsObj) {                        console.log("storeParsedEntityRecords called. arguments = %O", arguments);
        if ("interaction" === recrdsObj.name) {                                    console.log("storeParsedEntityRecords called. Interactions recrdsObj = %O", recrdsObj);
          intDataObj = recrdsObj;
          mergeEntitiesIntoDataObj(intDataObj, subEntityObjAry);
        } else if ("citation" === recrdsObj.name){                                  console.log("------------citations top record parsed. Merging now.")    //Vital citations is parsed last in its set
          citDataObj = recrdsObj;
          mergeEntitiesIntoDataObj(citDataObj, subEntityObjAry, storeMergedCits);
        } else {
          subEntityObjAry.push(recrdsObj);
          if (recrdsObj.name === topEntity) { processTopEntities(); }
        }
      }/* End storeParsedEntityRecords */
    } /* End forEachEntityInFile */
    function mergeEntitiesIntoDataObj(outerDataObj, subEntityObjAry, callback) {    console.log("mergeEntitiesIntoDataObj called. outerDataObj = %O,  subEntityObjAry = %O", outerDataObj, subEntityObjAry);
      ein.parse.mergeDataSet(fSysIdAry, outerDataObj, subEntityObjAry, callback);
    }
    function storeMergedCits(fSysId, mergedCitRecrds) {
      subEntityObjAry = [];
      subEntityObjAry.push(mergedCitRecrds);
      processTopEntities();
    }
  }/* End csvInteractionDataSetParse */
/*--------------- Methods For Testing -------------------------- */
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
  function openFolderCsvs() {
    return {
      type: 'openDirectory',
      accepts: [{
        mimeTypes: ['text/*'],
        extensions: ['csv']
      }]
    };
  }
}());  /* end of namespacing anonymous function */

