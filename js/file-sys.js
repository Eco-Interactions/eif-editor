(function(){
  /*
  * Global App Namespace
  * @type {object}
  */
  var ein = ECO_INT_NAMESPACE;
  /**
   * Exposed file system API
   */
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

  /**
   * Requests a user gesture to select a file or folder, according to params obj passed,
   * and passes the file id and file entry
   *
   * @param  {obj}  params  Contents passed determine whether a file or folder is selected.
   * @param  {func} objHandler  Callback to be used at a later point
   * @param  {func} fileTxtHandler  Callback to be used at a later point
   * @callback  {func} idHandler  Callback to consume the file entry
   */
  function userSelectFileSys(params, idHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.chooseEntry(params, function (fSysEntry) {  //console.log("fSysEntry = ", fSysEntry);
      if(!asyncErr()) {
          var fSysId = chrome.fileSystem.retainEntry(fSysEntry);    //console.log("fSysID = ", fSysId);
          idHandler(fSysId, fSysEntry, objHandler, fileTxtHandler);
        }
    });
  }
  /**
   * Attempts to restore a file from the local harddrive with its file system id.
   *
   * @param  {int} fSysId  Id of file to be restored from the local file system
   * @param  {func} objHandler  Callback to later consume the file/folder object
   * @param  {func} fileTxtHandler  Callback to be used at a later point
   * @callback  {func} entryHandler  Callback to consume the file entry
   */
  function fSysEntryFromId(fSysId, entryHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.isRestorable(fSysId, function(isRestorable) {
      if (isRestorable) {
        chrome.fileSystem.restoreEntry(fSysId, function(fSysEntry) {
          if (!asyncErr())  {//   console.log("successful entry");
            entryHandler(fSysId, fSysEntry, objHandler, fileTxtHandler);
          }
        });
      } else {
        objHandler(null);
      }
    });
  }

  /**
   * Takes in a file entry and passes on a file obj.
   *
   * @param  {int} fSysId  Id of file restored from the file system
   * @param  {obj} fSysEntry  File system entry from file system
   * @param  {func} fileTxtHandler  Callback to be used at a later point
   * @callback  {func} objHandler  Callback to consume the file object
   */
  function fileObjFromEntry(fSysId, fSysEntry, objHandler, fileTxtHandler) {  // console.log("fileObjFromEntry called= fSysEntry =", fSysEntry);
    asyncErr() || fSysEntry.file(function (fileObj) {
      objHandler(fSysId, fileObj, fileTxtHandler);
    });
  }
  /**
   * Outputs text from file Obj passed in.
   *
   * @param  {int} fSysId  Id of file restored from the file system
   * @param  {obj} fileObj  File obj representing file being opened
   * @param  {func} fileTxtHandler Callback to consume the file text being returned
   */
  function fileTxtFromObj(fSysId, fileObj, fileTxtHandler) {  // console.log("fileObjFromEntry called= fileTxtHandler =", fileTxtHandler);
    var reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onload = function(event) {
      fileTxtHandler(fSysId, event.target.result);
    };
    reader.readAsText(fileObj);
  }

  /* ============================================================== */
  /* === File System Entry Handler functions ====================== */
  /* ============================================================== */
  /**
   * If file system entry is a directory, call {@link readFolderData}
   *
   * @param  {int} fSysId  Id of file restored from file system
   * @param  {obj} fSysEntry  File system entry from file system
   * @param  {func} objHandler  Callback to later consume the file object
   * @param  {func} fileTxtHandler  Callback to later consume the file text
   */
  function postFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler) { //console.log("postFolderData fSysId = ", );
    if (fSysEntry.isDirectory) {
      readFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler);
    } else {
      folderReadFail(fSysEntry);
    }
  }
  /**
   * Build folderObj framework, create Directory reader, then call {@link readEntriesThenPost}
   *
   * @param  {int} fSysId  Id of file restored from file system
   * @param  {obj} fSysEntry  File system entry from file system
   * @param  {func} objHandler  Callback to later consume the file object
   * @param  {func} fileTxtHandler  Callback to later consume the file text
   */
  function readFolderData(fSysId, fSysEntry, objHandler, fileTxtHandler) { //console.log("readFolderData");
    var folderObj = {
      fSysId: fSysId,
      path: fSysEntry.fullPath,
      entries: []
    };
    var dirReader = fSysEntry.createReader();
    readEntriesThenPost();

    function readEntriesThenPost() {   //   console.log('readEntriesThenPost called.');
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

  function logFolderData(fSysId, folderObj, fileTxtHandler) {  //   console.log('logFolderData called. folderObj = %O. fileTxtHandler = %O', folderObj, fileTxtHandler);
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


  function createNewFile(writableFolderEntry, fileName, callback, fileText) {// console.log("no async error");
    writableFolderEntry.getFile(fileName, {create:true}, function(fileEntry) {     //     console.log("fileEntry", fileEntry);
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

