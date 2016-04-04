(function(){
  var ein = ECO_INT_NAMESPACE;
  var validationObj = {};
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
      csvEntity: selectCSVEntityParse,
      csvSet: selectCSVDataSetParse,
      intSet: intCSVParse,
      fileSet: csvFileSetParse
    };
  var entityCsvParseVals = {    /* Index 0 = dataSet, From 1 on are the sub entities in the order which they will be parsed  */
    author: ["author"],
    citation: ["citation", "publication"],
    interaction: ["interaction", "location", "taxon"],
    location: ["interaction"],
    publication: ["citation"],
    taxon: ["interaction"],
    interactionSet: ["interaction", "citation", "author"],
    citationSet: ["citation", "author"],
    authorSet: ["author"],
    intSet: ["interaction", "taxon"]
  };
  document.addEventListener("DOMContentLoaded", onDomLoaded);
  function onDomLoaded() { document.getElementById("toolbar").addEventListener("click", toolbarClickHandler); }

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
/*----------Select entity to parse-------------- */
  function selectCSVEntityParse() {
    var entity = document.getElementById('entitySelect').value;
    var dataSet = entityCsvParseVals[entity][0];
                                   /* params,      idHandler,            objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);

    function csvToObjForEntity(fSysId, text) {
      ein.csvHlpr.csvToObject(fSysId, text, validateEntity, dataSet);
    }
    function validateEntity(fSysId, recrdsAry) {
      ein.parse.parseChain(fSysId, recrdsAry, entity);
    }
  }
/*----------Select interaction file to parse-------------- */
  function intCSVParse() {
    var entitiesInFile = entityCsvParseVals["intSet"];
                                   /* params,      idHandler,            objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);

    function csvToObjForEntity(fSysId, text) {
      ein.csvHlpr.csvToObject(fSysId, text, validateEntity, entitiesInFile[0]);
    }
    function validateEntity(fSysId, recrdsAry) {
      ein.parse.parseChain(fSysId, recrdsAry, "interaction");
    }
  }
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
    function saveJSONresults(fSysId, mergedIntRecrds) {
      ein.fileSys.fileSaveAs(JSON.stringify(mergedIntRecrds.finalRecords, null, 2));
    }
  }/* End csvInteractionDataSetParse */
  /*----------Interaction File Set parsing-------------- */
  function csvFileSetParse() {// console.log("csvFileSetParse called");
    var fileNameStrngs = ["interaction", "citation", "author"];
    var fileObjs = {
      author: {},
      citation: {},
      interaction: {}
    };                       /* params,           idHandler,                 objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFolderParams(), ein.fileSys.getFolderData, ein.fileSys.readFolder, grabCsvFiles);

    function grabCsvFiles(pathStr, folderMap) { // console.log("grabCsvFiles called. folderMap = %O", folderMap); //Grab files with .csv extensions
      var fileSetIds = grabCsvFileIds(folderMap);
      if ( fileSetIds.length === 3 ) { validateFileSet(fileSetIds); }
        else { console.log("There are more or less than 3 .csv files in this folder."); }
    }
    function grabCsvFileIds(folderMap) { // console.log("grabCsvFileIds called. folderMap.files = %O", folderMap.files);
      var fileKeys = Object.keys(folderMap.files);
      var fileIds = fileKeys.map(function(fileKey) { return folderMap.files[fileKey].id; });
      return fileIds;
    }
    function validateFileSet(fileSetIds) {
      var validFileSet = fileSetIds.every(function(fileId) { return ifValidFileName(fileId); });
      if (validFileSet) { openFiles(); } else { console.log("Not a valid file set."); }
    }
    function ifValidFileName(fileId) { // console.log("ifValidFileName called.");
      var validFileName = fileNameStrngs.some(function(fileNameStr) { return ifStrInFileName(fileNameStr); }); // console.log("fileNameStr = %s, fileId = %s", fileNameStr, fileId);console.log("validFileName = ", validFileName);
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
      curFile === undefined ?
        parseAllRecrdObjs() :  /*Id,          entryHandler,         objHandler,          fileTxtHandler */
        ein.fileSys.entryFromId(fileObjs[curFile].fileId, ein.fileSys.getFileObj, ein.fileSys.readFile, objectifyCSV) ;

      function objectifyCSV(fSysId, fileText) {
        ein.csvHlpr.csvToObject(fSysId, fileText, storeCsvObj, curFile);
      }
    } /* End openFiles*/
    function storeCsvObj(fSysId, rcrdAryObjs, topEntity) {
      fileObjs[topEntity].orgRcrdAryObjs = rcrdAryObjs;
      openFiles();
    }
    function parseAllRecrdObjs() {
      var cb = ein.dataGrid.fillData;
      var validMode = isValidOnlyMode();
      if (validMode === true) { cb = displayValidationResults; }
      ein.parse.parseFileSet(fileObjs, validMode, cb);
    }
    function isValidOnlyMode() {
      var valChkbxElem = document.getElementById('loadIfValid');
      return valChkbxElem.checked ? true : false;
    }
  }/* End csvFileSetParse */
  function displayValidationResults(fSysIdAry, resultData) { console.log("displayValidationResults called. resultData = %O", resultData);
    var valResults = extractValidationResults(resultData); //console.log("Validation results = %O", valResults);
    var textRprt = buildRprt(valResults); //console.log("textRprt = %s", textRprt);
    ein.editorTxtArea.innerHTML = textRprt;
  }
  function extractValidationResults(resultData) {
    var valData = {};
    for (var topKey in resultData) { getEntityResultData(resultData[topKey]); }    console.log("Final valData = %O", valData);
    return valData;

    function getEntityResultData(entityResultData) {//console.log("getEntityResultData metaData: %O", entityResultData);
      var curEntity = entityResultData.name;// console.log("curEntity = %s", curEntity);
      valData[curEntity] = { cleanRecrds: entityResultData.finalRecords };
      if (entityResultData.valRpt !== undefined) {
        valData[curEntity].parseRpt = getParseRpt(curEntity), //parseRpt
        valData[curEntity].valErrs = getValErrs(curEntity)//valErrs (conflicts, invalidNulls, nullRef)
      }

      function getValErrs() { // console.log("valErrors = ")
        var errFields = ['rcrdsWithNullUnqKeyField', 'nullRefResults', 'shareUnqKeyWithConflictedData'];
        var errs = {};
        errFields.forEach(function(field){
          if (entityResultData.valRpt[field] !== undefined) { errs[field] = entityResultData.valRpt[field]; }
        });
        return errs;
      }
      function getParseRpt() { // console.log("valErrors = ")
        var rptFields = ['autoFill', 'dupCnt'];
        var rpt = {};
        rptFields.forEach(function(field){
          if (entityResultData.valRpt[field] !== undefined) { rpt[field] = entityResultData.valRpt[field]; }
        });
        return rpt;
      }
    } /* End getEntityResultData */
  } /* End extractValidMetaResults */
  function buildRprt(valData) {
    var rprtStr = '';
    var introStrng = `\nSome column headers in the spreadsheets are long, have spaces, or otherwise make the data reports more difficult to comprehend.
They have been replaced with shorter keys. There is a table at the bottom with the new keys and their related column headers in the spreadsheets.\n
Interaction ids correspond to the row number of the imported interaction csv.\n`;
    var invalidNullsStr = '\nRecords with no data in a required field: \n';
    var conflictsStr = '\nRecords that share unique key values and have conflicting data in other fields: \n';
    var nullRefStr = '\nRecords with references to non-existent, required entity records:\n';
    var divider = '---------------------------------------------------------------------------------------------------';
    for (var key in valData) {
      if (valData[key].valErrs !== undefined && valData[key].valErrs !== null) { buildRprtStrngs(valData[key].valErrs, key); }
    }
    rprtStr += divider + introStrng + divider + invalidNullsStr + divider + conflictsStr + divider + nullRefStr;// console.log("invalidNullsStr", invalidNullsStr);
    return rprtStr;

    function buildRprtStrngs(valErrs, entityName) {
      if (nonNullErrType("rcrdsWithNullUnqKeyField")) { addInvalidNulls(valErrs.rcrdsWithNullUnqKeyField, entityName) }
      if (nonNullErrType("shareUnqKeyWithConflictedData")) { addConflicts(valErrs.shareUnqKeyWithConflictedData, entityName) }
      if (nonNullErrType("nullRefResults")) { addNullRefs(valErrs.nullRefResults, entityName) }

      function nonNullErrType(errType) {
        return valErrs[errType] !== null && valErrs[errType] !== undefined;
      }
      function addInvalidNulls(invldNullRprt, entityName) {
        invalidNullsStr += '-- ' + entityName + ' records with ' + invldNullRprt.unqKey + ' field empty: \n\n';
        invldNullRprt.recrds.forEach(function(recrd){  //console.log("recrd = %O", recrd)
          invalidNullsStr += 'Interaction id(s): [Not sure how to grab these]';
          invalidNullsStr += addFieldsInRecrd(recrd) + '\n';
        });
        invalidNullsStr += '\n';
      }
      function addConflicts(conflictObj, entityName) { console.log("conflictObj = ", conflictObj);
        conflictsStr += '-- ' + 'There are ' + conflictObj.conCnt + ' ' + entityName + ' records to address: \n'
        for (var unqKey in conflictObj.recrds) {
          conflictsStr += '\n' + conflictObj.unqKey + ': ' + unqKey + ' \n';
          conflictObj.recrds[unqKey].forEach(function(recrd) {
            conflictsStr += addFieldsInRecrd(recrd, conflictObj.unqKey) + '\n';
          });
        }
        conflictsStr += '\n';
      }
      function addNullRefs(nullRefResults, entityName) { //console.log("addNullRefs called. arguments = %O", arguments)
        for (var entity in nullRefResults) {
          nullRefStr += '-- ' + 'Not able to match ' + nullRefResults[entity].cnt + ' ' + entity + ' record references (' + nullRefResults[entity].refKey + ') with valid records.\n\n';
          for (var key in nullRefResults[entity]) { //console.log("nullRefResults[entity] = %O", nullRefResults[entity][key]);
            if (key == "cnt" || key == "refKey") { continue }
            nullRefStr += 'Interaction id: ' + key + ', ' + processIntFields(nullRefResults[entity][key][0]) + '\n\n';
          }
        }
      }
      function processIntFields(recrd) { //console.log("recrd = %O", recrd)
        var str = 'citId: ' + recrd.citId + ', intType: ' + recrd.intType + ',' + addIntTags(recrd.intTag);
        str += addTaxonFields(recrd, "subjTaxon")+ addTaxonFields(recrd, "objTaxon");
        str += addFieldsInRecrd(recrd.location);
        return str;
      }
      function addTaxonFields(recrd, field) { //console.log("recrd[field] = %O", recrd[field])
        var levels = ['Species', 'Genus', 'Family', 'Order', 'Class', 'Kingdom'];
        var subStr = ' ' + field + ': ' + levels[--recrd[field].level] + ' ' + recrd[field].name + ', ';
        subStr += 'parent: ' + levels[--recrd[field].parent.level] + ' ' + recrd[field].parent.name + ',';
        return subStr;
      }
      function addIntTags(tagAry) {
        var subStr = ' intTags: ';
        tagAry.forEach(function(tag){
          subStr += tag + ','
        });
        return subStr;
      }
      function addFieldsInRecrd(recrd, unqKey) {
        var str = '';
        for (var field in recrd) { //console.log("field = %s, recrd = %O", field, recrd)
          if (field === unqKey || recrd[field] === null) { continue }
          if (typeof recrd[field] === "string" || typeof recrd[field] === "number") {  str += ' ' + field + ': ' + recrd[field] + ',';
          } else { str += addFieldsInRecrd(recrd[field]); }
        }
        return str;
      }/* End addFieldsInRecrd */
    } /* End buildRprtStr */
  } /* End buildRprt */

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

}());  /* end of namespacing anonymous function */

