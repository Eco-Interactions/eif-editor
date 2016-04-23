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
      clearProgStatus();
  }
  /* ============================================================== */
  /* === Toolbar Command functions ================================ */
  /* ============================================================== */

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
/*--------------------Helper Methods--------------------------------------------------------*/
  function isValidOnlyMode() {
    var valChkbxElem = document.getElementById('loadIfValid');
    return valChkbxElem.checked ? true : false;
    // return true;
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
      var validMode = isValidOnlyMode();
      var cb = validMode === true ? displayValidationResults : buildDataGridConfig;

      curProg = curProg + 3;        //    console.log("parseAllRecrdObjs called. curProg = ", curProg);
      boundSetProgress(curProg);

      ein.parse.parseFileSet(fileObjs, validMode, cb, boundSetProgress);
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
  function displayValidationResults(fSysIdAry, resultData) {   console.log("displayValidationResults called. arguemnts = %O", arguments);
    boundSetProgress(98);
    var valResults = extractValidationResults(resultData); //console.log("Validation results = %O", valResults);
    var textRprt = generateRprt(valResults, resultData);// console.log("textRprt = %s", textRprt);

    if (textRprt === false) {
      buildDataGridConfig(fSysIdAry, resultData.interaction)
    } else {
      boundSetProgress(100);
      ein.editorTxtArea.value = textRprt;
      setTimeout(clearProgStatus, 3000);
    }
    // ein.fileSys.fileSaveAs(textRprt);
  }
  function extractValidationResults(resultData) {
    var valData = {};
    for (var topKey in resultData) { getEntityResultData(resultData[topKey]); }  //  console.log("Final valData = %O", valData);
    return valData;

    function getEntityResultData(entityResultData) {    //console.log("getEntityResultData metaData: %O", entityResultData);
      var curEntity = entityResultData.name;// console.log("curEntity = %s", curEntity);
      valData[curEntity] = { cleanRecrds: entityResultData.finalRecords };
      if (entityResultData.valRpt !== undefined) {
        valData[curEntity].parseRpt = getParseRpt(curEntity), //parseRpt
        valData[curEntity].valErrs = getValErrs(curEntity)//valErrs (conflicts, invalidNulls, nullRef)
      }

      function getValErrs() { // console.log("valErrors = ")
        var errFields = ['rcrdsWithNullReqFields', 'nullRefResults', 'shareUnqKeyWithConflictedData'];
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
  function generateRprt(valData, resultData) { console.log("buildRprt called. valData = %O, resultData = %O", valData, resultData);
    var rprtStr = conflictsStr = nullRefStr = invalidNullsStr = '';
    var introStr = getIntroStr();
    var divider = '---------------------------------------------------------------------------------------------------';
    var smlDivider = '-----------------------------------------';
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
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
|                                                    Interaction                                                    |                 Citation                 |        Author         |
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
| ----Interaction id explanation----                                                                                | Citation ID: citId                       | Short Name: shortName |
| Primary or Secondary interaction: (Merged with intTag)                                                            | Citation Short Description: citShortDesc | Last: last            |
| Citation Number: citId                                                                                            | Full Text: fullText                      | First: first          |
| Citation Short Description: citShortDesc                                                                          | Authors: author                          | Middle: middle        |
| Region: region                                                                                                    | Year: year                               | Suffix: suffix        |
| Location Description: locDesc                                                                                     | Publication Title: pubTitle              |                       |
| Country: country                                                                                                  | Publication Type: pubType                |                       |
| Habitat Type: habType                                                                                             | Publisher: publisher                     |                       |
| Lat.: lat                                                                                                         | Issue: issue                             |                       |
| Long.: long                                                                                                       | Pages: pgs                               |                       |
| Elev. (or Range Min): elev                                                                                        |                                          |                       |
| Elev. Range Max: elevRangeMax                                                                                     |                                          |                       |
| Interaction Type: intType                                                                                         |                                          |                       |
| Interaction Tags: intTag                                                                                          |                                          |                       |
| Subject Order, Bat Family, Bat Genus, Bat Species: subjTaxon*                                                     |                                          |                       |
| Object Kingdom, Object Phylum, Object Class, Object Order, Object Family, Object Genus, Object Species: objTaxon* |                                          |                       |
|                                                                                                                   |                                          |                       |
| *Only the most specific taxon for subject and object is shown.                                                    |                                          |                       |
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
===================================================================================================
                                Data Validation Errors
===================================================================================================`;
    }
    function buildRprt() {
      var errors = false;
      var storedRprts = {};

      for (var key in valData) {
        if (valData[key].valErrs !== undefined && valData[key].valErrs !== null) { buildRprtStrngs(valData[key].valErrs, key); }
      }
      if (!errors) { return false; }

      invalidNullsStr += invalidNullsStrAry.join('\n' + smlDivider + '\n');
      conflictsStr += conflictsStrAry.join('\n');
      nullRefStr += nullRefStrAry.join('\n');
      rprtStr = [introStr, nullRefStr, invalidNullsStr, conflictsStr].join('\n');

      return rprtStr;

      function buildRprtStrngs(valErrs, entityName) {
        var unqKeyDict = { shortName: "Short Name", locDesc: "Location Description" , citId: "Citation Id" };
        if (nonNullErrType("rcrdsWithNullReqFields")) { addInvalidNulls(valErrs.rcrdsWithNullReqFields, entityName) }
        if (nonNullErrType("shareUnqKeyWithConflictedData")) { addConflicts(valErrs.shareUnqKeyWithConflictedData, entityName) }
        if (nonNullErrType("nullRefResults")) { addNullRefs(valErrs.nullRefResults, entityName) }

        function nonNullErrType(errType) {
          return valErrs[errType] !== null && valErrs[errType] !== undefined;
        }
        function addInvalidNulls(invldNullRprt, entityName) {  //console.log("%s invldNullRprt = %O",entityName, invldNullRprt);
          var tempNullStrAry = [];
          errors = true;
          invalidNullsStr = divider + '\n  Fields required but left blank:\n' + divider + '\n';        // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
          entityName === "location" && getLocNullRprt();
          entityName === "author" && getAuthNullRprt();
          entityName === "interaction" && getIntNullRprt();
          entityName === "citation" && getCitNullRprt();
          entityName === "taxon" && processTaxonNulLRprt();

          invalidNullsStrAry.push(tempNullStrAry.join('\n'));

          function getCitNullRprt() {
            var tempIdAry = [];
            invldNullRprt.recrds.forEach(function(recrd){ tempIdAry.push(recrd.citId); });

            tempNullStrAry.push('\n--Author missing for citations on rows: ' + tempIdAry.join(', ') + '.');
          }
          function processTaxonNulLRprt() { console.log("processTaxonNulLRprt called. invldNullRprt = %O", invldNullRprt)
            var taxonStrAry = [];
            for (var role in invldNullRprt) {
                var recrdCnt = invldNullRprt[role].length;
                var intIds = invldNullRprt[role].map(function(recrd){ return recrd.tempId+1 });
                taxonStrAry.push('--There are ' + recrdCnt + ' interaction records missing ' + role + 'ect taxon: ' + intIds.join(', ') + '.')
            }
            tempNullStrAry.push('\n' + taxonStrAry.join('\n'));
          }
          function getAuthNullRprt() {
            tempNullStrAry.push('\n--Author Short Name missing for the following records: \n');
            invldNullRprt.recrds.forEach(function(recrd){
              tempNullStrAry.push('  On row ' + recrd.tempId + ': ' + addFieldsInRecrd(recrd, "tempId"));
            });
            // tempNullStrAry.push('\n');
          }
          function getIntNullRprt() {  //console.log("interaction Null rprt = %O", invldNullRprt);
            var nullIds = [];
            invldNullRprt.recrds.forEach(function(recrd){ nullIds.push(recrd.tempId); });
            tempNullStrAry.push('\n--Citation ID missing for interaction records on rows: ' + nullIds.join(', ') + '.');
          }
          function getLocNullRprt() { console.log("location invldNullRprt = %O", invldNullRprt);
            var intLocRefObj = getIntIds();     //       console.log("intLocRefObj = %O", intLocRefObj);
            getIds();
            invldNullRprt.recrds.forEach(function(recrd){
              tempNullStrAry.push(mergeLocDataWithIntIds(recrd) + addFieldsInRecrd(recrd));
            });

            function mergeLocDataWithIntIds(recrd) {
              var concatLocData = concatLocFields(recrd);
              var str = '\n-There are ' +  intLocRefObj[concatLocData].length + ' interactions that have this location data and no location description. Rows: '
              return str + groupIntIds(intLocRefObj[concatLocData]) + '\n ';
            }
            function getIds() {  //console.log("invldNullRprt.concatLocFields = %O", invldNullRprt.concatLocFields)
              invldNullRprt.concatLocFields = concatFieldsInLocs();  console.log("invldNullRprt.concatLocFields = %O", invldNullRprt.concatLocFields)
              invldNullRprt.intIds = intLocRefObj;
            }
            function concatFieldsInLocs() {
              return invldNullRprt.recrds.map(function(recrd){
                var str = '';
                for (var key in recrd) { if (recrd[key] !== null) { str += recrd[key] }}
                return str;
              });
            }
            function getIntIds(recrd) {
              var refObj = {};
              resultData.interaction.orgRcrdAry.forEach(getIntsForInvalidLocs);
              return refObj;

              function getIntsForInvalidLocs(intRcrd) {
                intRcrd.locDesc === null && nonCollapsableData(intRcrd) && concatLocData(intRcrd);
              }
              function nonCollapsableData(intRcrd) {
                var locFieldsNull = ['elev', 'elevRangeMax', 'lat', 'long'].every(function(field) { return intRcrd[field] === null; });
                return !locFieldsNull;
              }
              function concatLocData(intRcrd) {                     // console.log("intRcrd = %O", intRcrd);
                var concatIntLocData = concatLocFields(intRcrd);      //   console.log("concatLocData called. concatIntLocData = %O", concatIntLocData)
                if (!(concatIntLocData in refObj)) { refObj[concatIntLocData] = []; }
                refObj[concatIntLocData].push(intRcrd.tempId-1);
              }
            } /* End getIntIds */
          } /* End getLocNullRprt */
        } /* End addInvalidNulls */
        function concatLocFields(rcrd) {
          var concatLocFields = '';
          var locFields = ['elev', 'elevRangeMax', 'lat', 'long', 'region', 'country', 'habType'];
          locFields.forEach(function(field){ if(rcrd[field] !== null) { concatLocFields += rcrd[field] }});  //console.log("concatLocFields = ", concatLocFields)
          return concatLocFields;
        }
        function addConflicts(conflictObj, entityName) { console.log("conflictObj = %O, entityName = %s", conflictObj, entityName);
          var tempConflictsStrAry = [];
          errors = true;
          conflictsStr = '\n' + divider + '\n  Conflicting data.\n' + divider + '\n';  // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.

          if (entityName === "location") { getIntIdsForRcrds(); //console.log("conflictObj.intIds = %O", conflictObj.intIds);
            } else { conflictsStrAry.push('\n-- ' + 'There are ' + conflictObj.conCnt + ' ' + entityName + ' records with the same ' + unqKeyDict[conflictObj.unqKey] + ' and conflicting data in other fields.'); }

          for (var sharedKey in conflictObj.recrds) {
            tempConflictsStrAry.push('\n-' + conflictObj.unqKey + ': ' + sharedKey);
            tempConflictsStrAry.push(buildConflictRprts(conflictObj.recrds[sharedKey], sharedKey));

            tempConflictsStrAry.push(smlDivider);
          }
          conflictsStrAry.push(tempConflictsStrAry.join('\n') + divider );

          function buildConflictRprts(recrdsAry, sharedKey) {
            var tempRprt = [];
            var locIntRcrds = [];     //'\n'- to seperate by one additional line the int ids and the location field data.
            recrdsAry.forEach(function(recrd, idx) {
              entityName === "location" && tempRprt.push(buildLocConflictRprt(recrd, idx));
              if (entityName === "citation" || entityName === "author" ) { tempRprt.push('      ' + addFieldsInRecrd(recrd, conflictObj.unqKey, ["tempId"])); }
            });
            entityName === "location" && tempRprt.push(locIntRcrds.join(''));

            return tempRprt.join('\n');

            function buildLocConflictRprt(recrd, idx) {
              var concatLocKey = concatLocFields(recrd);
              var intConflictIntro = '\n   Data Set ' + (idx + 1) + ' found in ' + conflictObj.intIds[sharedKey][concatLocKey].length + ' Interaction records at rows: ';
              locIntRcrds.push(intConflictIntro + groupIntIds(conflictObj.intIds[sharedKey][concatLocKey]));
              return '      Data Set ' + (idx + 1) + '- ' + addFieldsInRecrd(recrd, conflictObj.unqKey);

            }
          }
          function getIntIdsForRcrds() {  console.log("storedRprts.locNullRefs = %O", storedRprts.locNullRefs);
            var nullRefRslts = storedRprts.locNullRefs;
            conflictObj.intIds = {};

            tempConflictsStrAry.push("\n--Location Descriptions that have conflicting data in other location fields.");

            for (var locDescKey in nullRefRslts.intIdRefs) { // console.log("locDescKey = ", locDescKey);
              var refObj = conflictObj.intIds[locDescKey] = {};

              nullRefRslts.intIdRefs[locDescKey].forEach(function(intId){  // console.log("%s intId = %s, orgIntRcrds = %O", locDescKey, intId, resultData.interaction.orgRcrdAry);
                var locFieldsStr = concatLocFields(resultData.interaction.orgRcrdAry[intId-2]);// console.log("locDescKey %s. resultData.interaction.orgRcrdAry[intId-2] = %O", locDescKey,  resultData.interaction.orgRcrdAry[intId-2]);
                if (!(locFieldsStr in refObj)) { refObj[locFieldsStr] = [] }
                refObj[locFieldsStr].push(intId-1);
              });
            }console.log("conflictObj.intIds = %O", conflictObj.intIds);
          }
        } /* End addConflicts */
        function groupIntIds(intIdAry) {  //console.log("groupIntIds called. intIdAry = %O", arguments[0]);
          var procSeq, lastSeqId;
          var idSeqAry = [];
          intIdAry.forEach(function(id, i){      // console.log("id = %s, i=%s", id, i)
            if (i === 0) {
              procSeq = lastSeqId = id;
              if (intIdAry.length === 1) { finalSeq(id) }
              return;
            }
            if (i === intIdAry.length-1) { finalSeq(id)
            } else if (+id !== +lastSeqId+1) { resetSeq(id);
            } else { lastSeqId = id; }
          });   //console.log("idSeqAry joined = %s", idSeqAry.join(', '))
          return idSeqAry.join(', ') + '.';

          function resetSeq(id) {     //     console.log("resetSeq. procSeq = %s,  id = %s, lastSeqId=%s", procSeq, id, lastSeqId);
            if (+lastSeqId != +procSeq) { procSeq = ++procSeq + '-' + ++lastSeqId;
            } else { procSeq = ++procSeq; }
            idSeqAry.push(procSeq);
            procSeq = lastSeqId = id;
          }
          function finalSeq(id) {    //   console.log("finalSeq. id = %s, procSeq = %s", id, procSeq);
            if (+id === +procSeq) { procSeq = ++procSeq;
            } else if (+id === +lastSeqId+1){ procSeq = ++procSeq + '-' + ++id;
            } else { procSeq = ++procSeq + '-' + ++lastSeqId + ', ' + ++id }
            idSeqAry.push(procSeq);
          }
        } /* End groupIntIds */
        function addNullRefs(nullRefResults, entityName) { console.log("addNullRefs called. %s nullRefs = %O", entityName, nullRefResults);
          errors = true;
          var tempNullRefStrAry = [];
          nullRefStr = divider + '\n  Rows referenced but not found:\n' + divider + '\n';   // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
          "location" in nullRefResults && processLocNullRefs(nullRefResults.location);
          "citation" in nullRefResults && processCitNullRefs(nullRefResults, nullRefResults.citation);
          "author" in nullRefResults && processAuthorNullRefs(nullRefResults.author);

          nullRefStrAry.push(tempNullRefStrAry.join('\n'));

          function processLocNullRefs(locNullRefs) {    console.log("locNullRefs = %O", locNullRefs);
            var intLocRefs = {};
            for (var intId in locNullRefs) {// console.log("locNullRefs[intId] = %O", locNullRefs[intId]);
              var locNullObj = locNullRefs[intId];
              if (!(locNullObj[0].locDesc in intLocRefs)) { intLocRefs[locNullObj[0].locDesc] = [] }
                intLocRefs[locNullObj[0].locDesc].push(intId);
            }                                                 // console.log("intLocRefs = %O", intLocRefs)
            storedRprts.locNullRefs = { intIdRefs: intLocRefs };
          }
          function processCitNullRefs(nullRefResults, citNullRefs) { //console.log("nullRefResults = %O", nullRefResults);
            var citRcrdsRmvdWithNullRefs = rcrdsRmvdWithNullRefs.citation || false;          //       console.log("citRcrdsRmvdWithNullRefs @@ rcrdsRmvdWithNullRefs = %O", rcrdsRmvdWithNullRefs);
            var citRefsToRmvdRcrds = 0;
            var returnStrAry = [];
            var citRefs = {};
            for (var key in citNullRefs) { if(citNullRefs[key][0] !== undefined) { processCitRef(); } }

            if (citRcrdsRmvdWithNullRefs) { returnStrAry.push('  There are ' + citRefsToRmvdRcrds + ' Interaction records with references to the above ' + citRcrdsRmvdWithNullRefs.length + ' Citation records that have validation errors.\n');}

            if (!isEmpty(citRefs)) {returnStrAry.push(buildCitRefRprtStr(citRefs));}

            tempNullRefStrAry.push(returnStrAry.join('\n'));

            function processCitRef() {
              if (citRcrdsRmvdWithNullRefs && citRcrdsRmvdWithNullRefs.indexOf(parseInt(citNullRefs[key][0].citId)) > -1) { citRefsToRmvdRcrds++;
              } else {
                if (citRefs[citNullRefs[key][0].citId] === undefined) { citRefs[citNullRefs[key][0].citId] = []; }
                citRefs[citNullRefs[key][0].citId].push(key-1);
              }
            }
          } /* End processCitNullRefs */
          function buildCitRefRprtStr(citRefs) { console.log("buildCitRefRprtStr arguments = %O", arguments)
            var strAry = [];
            for ( var citId in citRefs ) {
              strAry.push('--Citation ' + citId + ' does not exist in the imported citation data and is referenced by ' + citRefs[citId].length + ' Interaction records on rows ' + groupIntIds(citRefs[citId]));
            }
            return '\n' + strAry.join('\n') + '\n';
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
            authStrAry.push(buildAuthRefReturnStr(tempAuthRefObj, rcrdsRmvdWithNullRefs.citation.length) + '\n');
            tempNullRefStrAry.push(authStrAry.join('\n'));

            function processAuth() {
              if (typeof authorNullRefs[key][0] === "object") {
                if (tempAuthRefObj[authorNullRefs[key].nullRefKeys] === undefined) { tempAuthRefObj[authorNullRefs[key].nullRefKeys] = []; };
                  tempAuthRefObj[authorNullRefs[key].nullRefKeys].push(key);
              }
            }
            function buildAuthRefReturnStr(tempAuthRefObj, citRecCnt) {           //    console.log("buildAuthRefReturnStr. tempAuthRefObj = %O", tempAuthRefObj);
              var strAry = ['\n--There are ' + citRecCnt + ' Citation records which reference Author short names not found in the Author data.\n',
                            '  Short Name             |  Citation IDs ', '---------------------------------------------'];
              var padding = '                       '; //23

              for (var auth in tempAuthRefObj) {
                strAry.push('  ' + pad(padding, auth) + '|  ' + pad (padding, tempAuthRefObj[auth].join(', ')));
              }
              return strAry.join('\n');
            }
          } /* End processAuthorNullRefs */
        } /* End addNullRefs */
        function processAuthFields(authRcrdsAry) { console.log("processAuthFields. arguments = %O", arguments);
          var authStr = '';
          authRcrdsAry.forEach(function(recrd){ //console.log("authRcrdsAry loop. recrd = %O, authStr = ", recrd, authStr);
            authStr += 'Author (shortName): ' + recrd.shortName + ',' + addFieldsInRecrd(recrd, 'shortName') + ' ';
          });                                                                   //console.log("authStr = ", authStr);
          return authStr;
        }
        function addFieldsInRecrd(recrd, unqKey, skipKeyAry) { //console.log("addFieldsInRecrd. arguments = %O", arguments);
          var skipKeyAry = skipKeyAry || [];
          var tempStrAry = [];
          for (var field in recrd) {// console.log("field = %s, recrd = %O", field, recrd)
            if (skipKeyAry.indexOf(field) > -1) { continue } //console.log("field = ", field);
            if (field === unqKey || recrd[field] === null || recrd[field] === undefined) { continue }
            if (typeof recrd[field] === "string" || typeof recrd[field] === "number") {
              tempStrAry.push(' ' + field + ': ' + recrd[field]);
            } else if (field === "author") { tempStrAry.push('Author (shortName): ' + recrd[field][0]);
            } else { tempStrAry.push(addFieldsInRecrd(recrd[field])); }
          }
          return tempStrAry.join(', ');
        } /* End addFieldsInRecrd */
      } /* End buildRprtStr */
    } /* End buildRprt */
  } /* End generateRprt */
  /*---------- Used by many ----------------*/
  function singleEntityValDisplay(fSysIdAry, resultData) {//  console.log("entityFileValDisplay called. arguments = %O", arguments)
    var displayObj = {};
    displayObj[resultData.name] = resultData;
    displayValidationResults(fSysIdAry, displayObj);
  }
  function entityFileValDisplay(fSysIdAry, resultData) { console.log("entityFileValDisplay called. arguments = %O", arguments)
    entityCsvParseVals[resultData.name];
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
      var cb = isValidOnlyMode() ? singleEntityValDisplay : ein.ui.show;
      ein.parse.parseChain(fSysId, recrdsAry, entity, cb);
    }
  }
/*----------Select interaction file to parse-------------- */
  function intCSVParse() {
    var entitiesInFile = entityCsvParseVals["interaction"];
                                   /* params,      idHandler,            objHandler,          fileTxtHandler */
    ein.fileSys.selectFileSys(openFileParams(), ein.fileSys.getFileObj, ein.fileSys.readFile, csvToObjForEntity);

    function csvToObjForEntity(fSysId, text) {
      ein.csvHlpr.csvToObject(fSysId, text, validateEntity, entitiesInFile[0]);
    }
    function validateEntity(fSysId, recrdsAry) {
      var validMode = isValidOnlyMode();
      var cb = isValidOnlyMode() ? entitySetValDisplay : ein.ui.show;
      ein.parse.parseChain(fSysId, recrdsAry, "interaction", cb, validMode);
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
/*-----------------------Misc Helpers---------------------------------*/
  function pad (pad, str, padLeft) {
    if (padLeft) {
      return (pad + str).slice(-pad.length);
    } else {
      return (str + pad).substring(0, pad.length);
    }
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
  /**
   * Checks if an object is empty
   * @param  {object}  obj
   * @return {Boolean}     Returns false if key is found.
   */
  function isEmpty(obj) {
    for (var x in obj) { return false; }
    return true;
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

