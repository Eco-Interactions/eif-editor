(function(){
  var ein = ECO_INT_NAMESPACE;
  var progBar, boundPopUp;
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
  var statusMsgDict = {
     2: " - Load file set",                       63: " - Validating Author entity",
    16: " - Finding files",                       68: " - Validating Citation entity",
    25: " - Reading Author file",                 75: " - Validating Publication entity",
    30: " - Parsing Author CSV",                  80: " - Validating Interaction entity",
    35: " - Reading Citation file",               87: " - Validating Location entity",
    40: " - Parsing Citation CSV",                93: " - Merging Citation data set",
    45: " - Reading Interaction file",            96: " - Merging Interaction data set",
    50: " - Parsing Interaction CSV",             98: " - Displaying validation results",
    55: " - Begin validation",                    99: " - Displaying data grid",        //data grid ending
    58: " - Validating file set",                100: ""
  };

  document.addEventListener("DOMContentLoaded", onDomLoaded);
  function onDomLoaded() {
    overlay = document.getElementById("overlay");
    popup = document.getElementById("popUpDiv");
    progBar = document.getElementById("progBar"); //console.log(progBar);
    boundSetProgress = setProgressStatus.bind(null, progBar);
    boundPopUp = popUp.bind(null, overlay, popup);
    document.getElementById("toolbar").addEventListener("click", toolbarClickHandler);
    document.getElementById("popupclose").onclick = function() {
        overlay.style.display = 'none';
        popup.style.display = 'none';
    };
  }
  /*---------------------Progress and Status Methods--------------------------------------*/

  function setProgressStatus(barElem, percent) {    // console.log("setProgress to %s\%", percent)
    var status = percent.toString() + '%' + statusMsgDict[percent];
    barElem.value = percent;
    ein.ui.setStatus(status);
  }
  function clearProgStatus() {
    document.getElementById('progBar').className = 'fade-out';
    ein.ui.setStatus("");
    setTimeout(function(){document.getElementById('progBar').className = 'hidden'}, 500);
  }

/*-------------PopUp Methods----------------------------------------------------*/
  function popUp(overlay, popup, contnt) {        console.log("popUp contnt = ", contnt)
      overlay.style.display = 'block';
      popup.style.display = 'block';        console.log("popup.firstChild = %O", popup)
      popup.firstElementChild.innerHTML = contnt;
  }

  /* ============================================================== */
  /* === Toolbar Command functions ================================ */
  /* ============================================================== */

  function toolbarClickHandler(clickEvent) {
    var btnId = clickEvent.srcElement.localName === 'button' ? clickEvent.srcElement.id : 'not-button';
    // ein.ui.setStatus('Button Clicked. btnId= ' + btnId);
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
/*------------------------------Interaction File Set parsing----------------------------------------------------------------------------- */
  /**
   * User selects folder with exactly 3 csv files (with author, citation and interaction in their file names). These files are turned into
   * record objects representing each entity and their valid data from the files. In 'valid mode' a report is generated deescribing any
   * errors in the validation process. If there were no errors, or not in 'valid mode', valid data is loaded into a data grid in the editor.
   */
  function csvFileSetParse() {// console.log("csvFileSetParse called");
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
        else { boundPopUp("<h3>There are " + (fileSetIds.length > 3 ? "more" : "less") + " than 3 .csv files in this folder.</h3>"); }
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
        boundPopUp('<h3>Invalid file name: "' + invalidFileId[1] + '".</h3>' +
          'Please use a file name with a csv extension and author, citation, or interaction in the file name.') }

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
      if (errors) { boundPopUp(errors); return false; }
      fileObjs[topEntity].orgRcrdAryObjs = rcrdAryObjs;
      openFiles();
    }
    function parseAllRecrdObjs(curProg) {      //   console.log("parseAllRecrdObjs curProg= ", curProg);
      curProg = curProg + 3;        //    console.log("parseAllRecrdObjs called. curProg = ", curProg);
      boundSetProgress(curProg);
      var cb = buildDataGridConfig;
      var validMode = isValidOnlyMode();
      if (validMode === true) { cb = displayValidationResults; }
      ein.parse.parseFileSet(fileObjs, validMode, cb, boundSetProgress);
    }
    function isValidOnlyMode() {
      var valChkbxElem = document.getElementById('loadIfValid');
      return valChkbxElem.checked ? true : false;
      //return true;
    }
  }/* End csvFileSetParse */
  function buildDataGridConfig(fSysIdAry, recrdsMetaData) {
    boundSetProgress(99);
    ein.dataGrid.buildConfig(recrdsMetaData.finalRecords, loadDataGrid);
  }
  function loadDataGrid(gridConfig) {
    ein.editorTxtArea.className = "hidden";

    agGridGlobalFunc('#grid-cntnr', gridConfig);       //return datagrid code, and config, to toolbar      //

    boundSetProgress(100);
    setTimeout(clearProgStatus, 3000);
  }
  function displayValidationResults(fSysIdAry, resultData) {  // console.log("displayValidationResults called. resultData = %O", resultData);
    boundSetProgress(98);
    var valResults = extractValidationResults(resultData); console.log("Validation results = %O", valResults);
    var textRprt = generateRprt(valResults);// console.log("textRprt = %s", textRprt);

    if (textRprt === false) {
      buildDataGridConfig(fSysIdAry, resultData.interaction.finalRecords)
    } else {
      boundSetProgress(100);
      ein.editorTxtArea.value = textRprt;
      setTimeout(clearProgStatus, 3000);
    }
  }
  function extractValidationResults(resultData) {
    var valData = {};
    for (var topKey in resultData) { getEntityResultData(resultData[topKey]); }  //  console.log("Final valData = %O", valData);
    return valData;

    function getEntityResultData(entityResultData) {//console.log("getEntityResultData metaData: %O", entityResultData);
      var curEntity = entityResultData.name;// console.log("curEntity = %s", curEntity);
      valData[curEntity] = { cleanRecrds: entityResultData.finalRecords };
      if (entityResultData.valRpt !== undefined) {
        valData[curEntity].parseRpt = getParseRpt(curEntity), //parseRpt
        valData[curEntity].valErrs = getValErrs(curEntity)//valErrs (conflicts, invalidNulls, nullRef)
      }

      function getValErrs() { // console.log("valErrors = ")
        var errFields = ['rcrdsWithNullUnqKeyField', 'nullRefResults', 'shareUnqKeyWithConflictedData', 'nullTaxa'];
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
  function generateRprt(valData) { console.log("buildRprt called. valData = %O", valData);
    var rprtStr = conflictsStr = nullRefStr = invalidNullsStr = '';
    var introStr = getIntroStr();
    var divider = '---------------------------------------------------------------------------------------------------';
    var rcrdsRmvdWithNullRefs = {};
    var conflictsStrAry = [];
    var nullRefStrAry = [];
    var invalidNullsStrAry = [];

    return buildRprt();
    // rprtStr += introStrng + invalidNullsStr + divider + conflictsStr + divider + nullRefStr;// console.log("invalidNullsStr", invalidNullsStr);


    function getIntroStr() {
      return `                                 Reference Table
---------------------------------------------------------------------------------------------------
Some column headers in the spreadsheets are long, have spaces, or otherwise make this report more difficult to format in a way that is easy to read.
These names have been replaced with shorter ones. The table below shows the column headers from the spreadsheets with their shortened equivalents.
+-----------------------------------------------------------------------------------------------------+------------------------------------------+------------------------+
|                                             Interaction                                             |                 Citation                 |         Author         |
+-----------------------------------------------------------------------------------------------------+------------------------------------------+------------------------+
| ----Interaction id explanation----                                                                  | Citation ID: citId                       | Short Name: shortName  |
| Primary or Secondary interaction: (Merged with intTag)                                              | Citation Short Description: citShortDesc | Last: last             |
| Citation Number: citId                                                                              | Full Text: fullText                      | First: first           |
| Citation Short Description: citShortDesc                                                            | Authors: author                          | Middle: middle         |
| Region: region                                                                                      | Year: year                               | Suffix: suffix         |
| Location Description: locDesc                                                                       | Publication Title: pubTitle              |                        |
| Country: country                                                                                    | Publication Type: pubType                |                        |
| Habitat Type: habType                                                                               | Publisher: publisher                     |                        |
| Lat.: lat                                                                                           | Issue: issue                             |                        |
| Long.: long                                                                                         | Pages: pgs                               |                        |
| Elev. (or Range Min): elev                                                                          |                                          |                        |
| Elev. Range Max: elevRangeMax                                                                       |                                          |                        |
| Interaction Type: intType                                                                           |                                          |                        |
| Interaction Tags: intTag                                                                            |                                          |                        |
| Subject Order, Bat Family, Bat Genus, Bat Species: subjTaxon*                                       |                                          |                        |
| Plant/Arthropod, Object Class, Object Order, Object Family, Object Genus, Object Species: objTaxon* |                                          |                        |
|                                                                                                     |                                          |                        |
| *Only the most specific taxon for subject and object is shown.                                      |                                          |                        |
+-----------------------------------------------------------------------------------------------------+------------------------------------------+------------------------+
===================================================================================================
                                Data Validation Errors
===================================================================================================`;
    }
    function buildRprt() {
      var errors = false;

      for (var key in valData) {
        if (valData[key].valErrs !== undefined && valData[key].valErrs !== null) { buildRprtStrngs(valData[key].valErrs, key); }
      }
      if (!errors) { return false; }

      invalidNullsStr += invalidNullsStrAry.join('\n');
      conflictsStr += conflictsStrAry.join('\n');
      nullRefStr += nullRefStrAry.join('\n');
      rprtStr = [introStr, invalidNullsStr, conflictsStr, nullRefStr].join('\n');

      return rprtStr;

      function buildRprtStrngs(valErrs, entityName) {
        if (nonNullErrType("rcrdsWithNullUnqKeyField")) { addInvalidNulls(valErrs.rcrdsWithNullUnqKeyField, entityName) }
        if (nonNullErrType("shareUnqKeyWithConflictedData")) { addConflicts(valErrs.shareUnqKeyWithConflictedData, entityName) }
        if (nonNullErrType("nullRefResults")) { addNullRefs(valErrs.nullRefResults, entityName) }

        function nonNullErrType(errType) {
          return valErrs[errType] !== null && valErrs[errType] !== undefined;
        }
        function addInvalidNulls(invldNullRprt, entityName) {
          var tempNullStrAry = [];
          errors = true;
          invalidNullsStr = divider + '\nRecords with no data in a required field:\n\n';        // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.

          invldNullRprt.recrds.forEach(function(recrd){  tempNullStrAry.push(addFieldsInRecrd(recrd)); });

          invalidNullsStrAry.push('-- There are ' + invldNullRprt.recordCnt + ' ' + entityName + ' records with data and with ' +     //For each entity with invalid nulls
                                     invldNullRprt.unqKey + ' field empty:\n', tempNullStrAry.join('\n') );
        }
        function addConflicts(conflictObj, entityName) { //console.log("conflictObj = ", conflictObj);
          errors = true;
          var tempConflictsStrAry = [];
          conflictsStr = '\n' + divider + '\nRecords that share unique key values and have conflicting data in other fields:\n';  // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
          conflictsStrAry.push('\n-- ' + 'There are ' + conflictObj.conCnt + ' ' + entityName + ' records to address:');
          for (var unqKey in conflictObj.recrds) {
            tempConflictsStrAry.push('\n' + conflictObj.unqKey + ': ' + unqKey);
            conflictObj.recrds[unqKey].forEach(function(recrd) {
              tempConflictsStrAry.push(addFieldsInRecrd(recrd, conflictObj.unqKey));
            });
          }
          conflictsStrAry.push(tempConflictsStrAry.join('\n'));
        }
        function addNullRefs(nullRefResults, entityName) { //console.log("addNullRefs called. arguments = %O", arguments)
          errors = true;
          var tempNullRefStrAry = [];
          nullRefStr = '\n' + divider + '\nRecords with references to non-existent, required entity records:\n';   // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
          entityName === "taxon" && processTaxonNulLRefs(nullRefResults);
          for (var entity in nullRefResults) {
              entity === "author" && processAuthorNullRefs(nullRefResults[entity]);
              entity === "citation" && processCitNullRefs(nullRefResults, nullRefResults[entity]);
          }
          nullRefStrAry.push(tempNullRefStrAry.join('\n'));

          function processCitNullRefs(nullRefResults, citNullRefs) { //console.log("nullRefResults = %O", nullRefResults);
            var citRcrdsRmvdWithNullRefs = rcrdsRmvdWithNullRefs.citation || false;          //       console.log("citRcrdsRmvdWithNullRefs @@ rcrdsRmvdWithNullRefs = %O", rcrdsRmvdWithNullRefs);
            var citRefsToRmvdRcrds = 0;
            var returnStrAry = [];
            var citRefs = {};
            for (var key in citNullRefs) {
              if(citNullRefs[key][0] !== undefined) { processCitRef(); }
            }
            if (citRcrdsRmvdWithNullRefs) {returnStrAry.push('--There are ' + citRefsToRmvdRcrds + ' Interaction records with references to ' + citRcrdsRmvdWithNullRefs.length + ' Citation records that have validation errors.\n');}
            returnStrAry.push(buildCitRefRprtStr(citRefs));
            tempNullRefStrAry.push(returnStrAry.join('\n'));

            function processCitRef() {
              if (citRcrdsRmvdWithNullRefs && citRcrdsRmvdWithNullRefs.indexOf(parseInt(citNullRefs[key][0].citId)) > -1) { citRefsToRmvdRcrds++;
              } else {
                if (citRefs[citNullRefs[key][0].citId] === undefined) { citRefs[citNullRefs[key][0].citId] = []; }
                citRefs[citNullRefs[key][0].citId].push(key);
              }
            }
          } /* End processCitNullRefs */
          function buildCitRefRprtStr(citRefs) { //console.log("buildCitRefRprtStr arguments = %O", arguments)
            var strAry = [];
            for ( var citId in citRefs ) {
              strAry.push('--There are ' + citRefs[citId].length + ' Interaction records referencing missing Citation ' + citId + ': ' + citRefs[citId].join(', ') + '.');
            }
            return strAry.join('\n');
          }
          function processAuthorNullRefs(authorNullRefs) {        //        console.log("processAuthorNullRefs. authorNullRefs = %O", authorNullRefs);
            var tempAuthRefObj = {};
            var str = '';
            var authStrAry = [];
            rcrdsRmvdWithNullRefs.citation = [];
            for(var key in authorNullRefs) {
              if (authorNullRefs[key][0] !== undefined) {
                rcrdsRmvdWithNullRefs.citation.push(parseInt(key));  // console.log("rcrdsRmvdWithNullRefs.citation pushing now");
                processAuth();
              }
            }
            authStrAry.push(buildAuthRefReturnStr(tempAuthRefObj, rcrdsRmvdWithNullRefs.citation.length), '\n');
            tempNullRefStrAry.push(authStrAry.join('\n'));

            function processAuth() {
              if (typeof authorNullRefs[key][0] === "object") {
                if (tempAuthRefObj[authorNullRefs[key].nullRefKeys] === undefined) { tempAuthRefObj[authorNullRefs[key].nullRefKeys] = []; };
                  tempAuthRefObj[authorNullRefs[key].nullRefKeys].push(key);
              }
            }
            function buildAuthRefReturnStr(tempAuthRefObj, citRecCnt) {           //    console.log("buildAuthRefReturnStr. tempAuthRefObj = %O", tempAuthRefObj);
              var strAry = ['\n--Missing Author short name references in ' + citRecCnt + ' Citation records:\n'];
              for (var auth in tempAuthRefObj) {
                strAry.push(auth + ' -referenced in Citation record: ' + tempAuthRefObj[auth].join(', ') + '.');
              }
              return strAry.join('\n');
            }
          } /* End processAuthorNullRefs */
          function processTaxonNulLRefs(taxonNullRefs) { //console.log("processTaxonNulLRefs called. taxonNullRefs = %O", taxonNullRefs)
            var taxonStrAry = [];
            for (var role in taxonNullRefs) {
                var recrdCnt = taxonNullRefs[role].length;
                var intIds = taxonNullRefs[role].map(function(recrd){ return recrd.tempId });
                taxonStrAry.push('\n--There are ' + recrdCnt + ' interaction records missing ' + role + 'ect taxon: ' + intIds.join(', ') + '.')
            }
            tempNullRefStrAry.push(taxonStrAry.join('\n'));
          }
        } /* End addNullRefs */
        function addFieldsInRecrd(recrd, unqKey, skipKeyAry) {// console.log("addFieldsInRecrd. arguments = %O", arguments);
          var skipKeyAry = skipKeyAry || [];
          var tempStrAry = [];
          for (var field in recrd) {// console.log("field = %s, recrd = %O", field, recrd)
            if (skipKeyAry.indexOf(field) > -1) { continue } //console.log("field = ", field);
            if (field === unqKey || recrd[field] === null || recrd[field] === undefined) { continue }
            if (typeof recrd[field] === "string" || typeof recrd[field] === "number") {  tempStrAry.push(' ' + field + ': ' + recrd[field]);
            } else { tempStrAry.push(addFieldsInRecrd(recrd[field])); }
          }
          return tempStrAry.join(', ');
        } /* End addFieldsInRecrd */
      } /* End buildRprtStr */
    } /* End buildRprt */
  } /* End generateRprt */
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

/*-------------Not in use----------------------------------------------------------------------- */
  // function processAuthFields(authRcrdsAry) {// console.log("processAuthFields. arguments = %O", arguments);
  //   var authStr = '';
  //   authRcrdsAry.forEach(function(recrd){ //console.log("authRcrdsAry loop. recrd = %O, authStr = ", recrd, authStr);
  //     authStr += 'Author (shortName): ' + recrd.shortName + ',' + addFieldsInRecrd(recrd, 'shortName') + ' ';
  //   });                                                                   //console.log("authStr = ", authStr);
  //   return authStr;
  // }
  // function processIntFields(recrd) { //console.log("recrd = %O", recrd)
  //   var str = 'citId: ' + recrd.citId + ', intType: ' + recrd.intType + ',' + addIntTags(recrd.intTag);
  //   str += addTaxonFields(recrd, "subjTaxon")+ addTaxonFields(recrd, "objTaxon");
  //   str += addFieldsInRecrd(recrd.location);
  //   return str;
  // }
  // function processPubFields(pubRecrd) {
  //   var pubStr = '';
  //   for (var key in pubRecrd) {
  //     if (pubRecrd[key] !== null) {
  //       pubStr += key + ': ' + pubRecrd[key] + ', '
  //     }
  //   }
  //   return pubStr + '\n';
  // }
  // function addTaxonFields(recrd, field) { //console.log("recrd[field] = %O", recrd[field])
  //   var levels = ['Species', 'Genus', 'Family', 'Order', 'Class', 'Kingdom'];
  //   if (recrd[field] !== undefined) {
  //     var subStr = ' ' + field + ': ' + levels[--recrd[field].level] + ' ' + recrd[field].name + ', ';
  //     // subStr += 'parent: ' + levels[--recrd[field].parent.level] + ' ' + recrd[field].parent.name + ',';
  //     return subStr;
  //   }
  // }
  // function addIntTags(tagAry) {
  //   if (tagAry !== undefined) {
  //     var subStr = ' intTags: ';
  //     tagAry.forEach(function(tag){
  //       subStr += tag + ', '
  //     });
  //     return subStr;
  //   }
  // }

}());  /* end of namespacing anonymous function */

