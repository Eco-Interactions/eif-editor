(function(){
  var appData;
  var curFiles = { open: false, appData: false, meta: {} };
  var msgRouter = { fileSysId: {}, responseObj: {} };
  var tagMap = {};
  var ein = ECO_INT_NAMESPACE;
  ein.fileSys = {
    selectFileSys: userSelectFileSys,
    entryFromId: fSysEntryFromId,
    getFileObj: fileObjFromEntry,
    getFolderData: postFolderData,
    saveFile: restoreEntryToSave,
    fileSaveAs: selectFileSaveAs,
    getFolderEntry: writableFolderFromId,
    createFile: createNewFile,
    createFolder: createNewFolder,
    readFile: function(fSysId, fileObj, fileTxtHandler) { fileTxtFromObj(fSysId, fileObj, fileTxtHandler) },
    readFolder: function(fSysId, folderObj, fileTxtHandler) { logFolderData(fSysId, folderObj, fileTxtHandler) }
  };

  /* ============================================================== */
  /* === File System Access Point functions ======================= */
  /* ============================================================== */

  /* requsts a user gesture to select a file or folder (depending on *
   * params passed) and posts the ID to the sandbox                  */
  function userSelectFileSys(params, idHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.chooseEntry(params, function (fSysEntry) {  //console.log("fSysEntry = ", fSysEntry);
      if(!asyncErr()) {
          var fSysId = chrome.fileSystem.retainEntry(fSysEntry);    //console.log("fSysID = ", fSysId);
          idHandler(fSysId, fSysEntry, objHandler, fileTxtHandler);
        }
    });
  }

  function fSysEntryFromId(fSysId, entryHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.isRestorable(fSysId, function(isRestorable) {
      if (isRestorable) {
        chrome.fileSystem.restoreEntry(fSysId, function(fSysEntry) {
          if (!asyncErr())  {   console.log("successful entry");
            entryHandler(fSysId, fSysEntry, objHandler, fileTxtHandler);
          }
        });
      } else {
        objHandler(null);
      }
    });
  }

  function fileObjFromEntry(fSysId, fSysEntry, objHandler, fileTxtHandler) {   console.log("fileObjFromEntry called= fSysEntry =", fSysEntry);
    asyncErr() || fSysEntry.file(function (fileObj) {
      objHandler(fSysId, fileObj, fileTxtHandler); console.log("objHandler");
    });
  }

  function fileTxtFromObj(fSysId, fileObj, fileTxtHandler) {
    var reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onload = function(event) { console.log('file text = %s', event.target.result);
      fileTxtHandler(fSysId, event.target.result);
    };
    reader.readAsText(fileObj);
  }

  /* ============================================================== */
  /* === File System Entry Handler functions ====================== */
  /* ============================================================== */

  function postFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler) { //console.log("postFolderData fSysId = ", );
    if (fSysEntry.isDirectory) {
      readFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler);
    } else {
      folderReadFail(fSysEntry);
    }
  }

  function readFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler) { console.log("readFolderData");
    console.log("folderObj");
    var folderObj = {
      fSysId: fSysId,
      path: fSysEntry.fullPath,
      entries: []
    };
    var dirReader = fSysEntry.createReader();   console.log("readFolderData create dirReader");
    readEntriesThenPost();

    function readEntriesThenPost() {      console.log('readEntriesThenPost called.');
      dirReader.readEntries(function (entryBatch) {
        if (entryBatch.length > 0) {
          entryBatch.forEach(function (fSysEntry) {
            folderObj.entries.push(pkgEntryData(fSysEntry));
          });
          readEntriesThenPost();
        } else {
          objHandler(fSysId, folderObj, fileTxtHandler);
        }
      }, errorHandler);
    }
  }

  function pkgEntryData(fSysEntry) {
    return {
        name: fSysEntry.name,
        fSysId: chrome.fileSystem.retainEntry(fSysEntry),
        isFile: fSysEntry.isFile,
        isDirectory: fSysEntry.isDirectory,
        path: fSysEntry.fullPath
      };
  }

  function logFolderData(fSysId, folderObj, fileTxtHandler) {     console.log('logFolderData called. folderObj = %O', folderObj);
    var folderMap = mapFolderData(folderObj);
    fileTxtHandler('folder data for ' + folderObj.path, folderMap);
  }

  function mapFolderData(folderObj) {
    var folderMap = {
        id: folderObj.fSysId,
        path: folderObj.path,
        files: {},
        folders: {}
      };
    folderObj.entries.forEach(function (entry) {
      if (entry.isFile) {
        folderMap.files[entry.name] = mapFolderEntry(entry);
      } else {
        folderMap.folders[entry.name] = mapFolderEntry(entry);
      }
    })
    return folderMap;
  }

  function mapFolderEntry(entry) {
    return {
        id: entry.fSysId,
        path: entry.path
      };
  }

  function restoreEntryToSave(fileId, fileText, callback) {  //console.log('selectFileSaveAs fileText = ', fileText);
    chrome.fileSystem.restoreEntry(fileId, function (fSysEntry) {  //console.log("selectFileSaveAs fSysEntry = ", fSysEntry);
      if(chrome.runtime.lastError) { asyncErr() }
        else {
          saveFileEntry(fSysEntry, fileText, callback);
        }
    });
  }

  function selectFileSaveAs(fileText) { // console.log('selectFileSaveAs fileText = ', fileText);
    var params = {
      type: 'saveFile',
      accepts: [{
        mimeTypes: ['text/*'],
        extensions: ['js', 'css', 'txt', 'html', 'json', 'svg', 'md']
      }]
    };
    chrome.fileSystem.chooseEntry(params, function (fSysEntry) { // console.log("selectFileSaveAs fSysEntry = ", fSysEntry);
      if(chrome.runtime.lastError) { asyncErr() }
        else {
          saveFileEntry(fSysEntry, fileText);   console.log ("File Text", fileText);
        }
    });
  }

  function saveFileEntry(fSysEntry, fileText, callback) {   // console.log('saveFileEntry fileText = ', fileText);
    chrome.fileSystem.getWritableEntry(fSysEntry, function (writableEntry) {
      if (writableEntry) {
        writeFileEntry(fSysEntry, fileText, writableEntry, callback);
      } else {
        console.log('No writable entry');
      }
    });
  }

  function writeFileEntry(fSysEntry, fileText, writableEntry, callback) {
    var fileBlob = new Blob([fileText], {type: 'text/plain'});
    writableEntry.createWriter(function(writer) {
      writer.onerror = errorHandler;
      writer.onwriteend = callback || function () { console.log('File ' + fSysEntry.name + ' saved'); };
      writer.truncate(fileBlob.size);
      waitForIO(writer, function() {
        writer.seek(0);
        writer.write(fileBlob);
      });
    }, errorHandler);
  }

// -  function createNewFile(reqPkg) {
// -    chrome.fileSystem.getWritableEntry(reqPkg.fSysEntry, function(writableFolderEntry) {
// -      writableFolderEntry.getFile(reqPkg.name, {create:true}, function(fileEntry) {
// -        fileEntry.createWriter(function(writer) {
// -          writer.write(new Blob([reqPkg.fileText], {type: 'text/plain'}));
// -          postMsg('statusMsg', 'File ' + reqPkg.fSysEntry.name + ' saved');


  function createNewFile(writableFolderEntry, fileName, callback, fileText) { console.log("no async error");
    writableFolderEntry.getFile(fileName, {create:true}, function(fileEntry) {          console.log("fileEntry", fileEntry);
      if (callback) {
        var fSysId = chrome.fileSystem.retainEntry(fileEntry);
        callback(fSysId);
      }
      fileEntry.createWriter(function(writer) {
        writer.write(new Blob([fileText], {type: 'text/plain'}));                   console.log('File ' + fileName + ' saved');
      });
    });
  }


  function writableFolderFromId (folderId, writeHandler, name, callback, fileText) {
    chrome.fileSystem.isRestorable(folderId, function(isRestorable) {
      if (isRestorable) {
        chrome.fileSystem.restoreEntry(folderId, function(folderEntry) {
          if (!asyncErr())  {
            chrome.fileSystem.getWritableEntry(folderEntry, function(writableFolderEntry) {        console.log("getWritableEntry. writableFolderEntry", writableFolderEntry);
              if (!asyncErr()) { writeHandler(writableFolderEntry, name, callback, fileText) }
            });
          }
        });
      }
    });
  }

  function createNewFolder(writableFolderEntry, name, callback) { console.log("createNewFolder called");
    writableFolderEntry.getDirectory(name, {create:true}, function(folderEntry) { console.log("getDirectory", name, callback);
      var fSysId = chrome.fileSystem.retainEntry(fileEntry);
      callback(fSysId);
    });
  }

  /* ============================================================== */
  /* === File System Helper functions ============================= */
  /* ============================================================== */



  function waitForIO(writer, callback) {
    // set a watchdog to avoid eventual locking:
    var start = Date.now();
    // wait for a few seconds
    var reentrant = function() {
      if (writer.readyState===writer.WRITING && Date.now()-start<4000) {
        setTimeout(reentrant, 100);
        return;
      }
      if (writer.readyState===writer.WRITING) {
        console.error("Write operation taking too long, aborting!"+
          " (current writer readyState is "+writer.readyState+")");
        writer.abort();
      }
      else {
        callback();
      }
    };
    setTimeout(reentrant, 100);
  }

  /* ============================================================== */
  /* === Error Handling functions ================================= */
  /* ============================================================== */

  function asyncErr() {
    var asynchErrorMsgDict = { 'User cancelled': 'User canceled opening a file' };
    if(chrome.runtime.lastError) {
      if (chrome.runtime.lastError.message in asynchErrorMsgDict) {
        console.log('statusMsg', asynchErrorMsgDict[chrome.runtime.lastError.message]);
      } else {
        console.log('local error caught. errorObj:%O', chrome.runtime.lastError);
      }
      return true;
    } else {
      return false;
    }
  }

  function folderReadFail(folderEntry) {
    console.log('Expected folder entry, instead recieved:%O', folderEntry);
  }

  function errorHandler(e) {
    console.error(e);
    console.log("errorHandler");
  }

  /* ============================================================== */
  /* === Old Code ================================================= */
  /* ============================================================== */

  // function logFolderData(fSysId, folderObj) {
  //   var folderMap = mapFolderData(folderObj);
  //   ein.ui.devLog('folder data for ' + folderObj.path, folderMap);
  // }

  // function mapFolderData(folderObj) {
  //   var folderMap = {
  //       id: folderObj.fSysId,
  //       path: folderObj.path,
  //       files: {},
  //       folders: {}
  //     };
  //   folderObj.entries.forEach(function (entry) {
  //     if (entry.isFile) {
  //       folderMap.files[entry.name] = mapFolderEntry(entry);
  //     } else {
  //       folderMap.folders[entry.name] = mapFolderEntry(entry);
  //     }
  //   })
  //   return folderMap;
  // }

  // function mapFolderEntry(entry) {
  //   return {
  //       id: entry.fSysId,
  //       path: entry.path
  //     };
  // }

}());  /* end of namespacing anonymous function */

