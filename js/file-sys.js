(function(){
  var appData;
  var curFiles = { open: false, appData: false, meta: {} };
  var msgRouter = { fileSysId: {}, responseObj: {} };
  var tagMap = {};
  var ein = ECO_INT_NAMESPACE;
  ein.fileSys = {
    getFileSysId: function (params, idHandler, objHandler, fileTxtHandler) {
      userSelectFileSys(params, idHandler, objHandler, fileTxtHandler)
    },
    getFileObj: function (fSysId, objHandler, fileTxtHandler) {
      fSysEntryFromId(fSysId, fileObjFromEntry, objHandler, fileTxtHandler)
    },
    saveFile: function (fSysId, objHandler, fileTxtHandler) {
      fSysEntryFromId(fSysId, saveFileEntry, objHandler, fileTxtHandler)
    },
    createFile: function (params) { fileSysRequest(params, createNewFile) },
    getFolderData: function (fSysId, objHandler, fileTxtHandler) {
      fSysEntryFromId(fSysId, postFolderData, objHandler, fileTxtHandler)
    },
    createFolder: function (params) { fileSysRequest(params, createNewFolder) },
    readFile: function(fileObj, fileTxtHandler) {
      readFile(fileObj, function (event) {
        fileTxtHandler(event.target.result);
        // curFiles.open = fileId;
      });
    },
    readFolder: function(folderObj, fileTxtHandler) { logFolderData(folderObj, fileTxtHandler) }
  };

  /* ============================================================== */
  /* === File System Access Point functions ======================= */
  /* ============================================================== */

  /* requsts a user gesture to select a file or folder (depending on *
   * params passed) and posts the ID to the sandbox                  */
  function userSelectFileSys(params, idHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.chooseEntry(params, function (fSysEntry) {  //console.log("fSysEntry = ", fSysEntry);
      var fSysId = chrome.fileSystem.retainEntry(fSysEntry);
      asyncErr() || idHandler(fSysId, objHandler, fileTxtHandler, fSysEntry);
    });
  }

  function fSysEntryFromId(fSysId, entryHandler, objHandler, fileTxtHandler) {
    chrome.fileSystem.isRestorable(fSysId, function(isRestorable) {
      if (isRestorable) {
        chrome.fileSystem.restoreEntry(fSysId, function(fSysEntry) {
          if (!asyncErr())  {
            entryHandler(fSysEntry, objHandler, fileTxtHandler);   //console.log('entryHandler, fileTxtHandler = %O', fileTxtHandler);
          }
        });
      } else {
        objHandler(null);
      }
    });
  }

  function fileObjFromEntry(fSysEntry, objHandler, fileTxtHandler) {    //  console.log('fileObjFromEntry called. fSysEntry = %O', fSysEntry);
    asyncErr() || fSysEntry.file(function (fileObj) {
      objHandler(fileObj, fileTxtHandler);
    });
  }

  function readFile(fileObj, fileTxtHandler) {
    var reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onload = fileTxtHandler;
    reader.readAsText(fileObj);
  }

  /* ============================================================== */
  /* === File System Entry Handler functions ====================== */
  /* ============================================================== */

  function postFolderData(fSysEntry, objHandler, fileTxtHandler) {
    if (fSysEntry.isDirectory) {
      readFolderData(fSysEntry, objHandler, fileTxtHandler);
    } else {
      folderReadFail(fSysEntry);
    }
  }

  function readFolderData(fSysEntry, objHandler, fileTxtHandler) {
    var folderObj = {
      fSysId: chrome.fileSystem.retainEntry(fSysEntry),
      path: fSysEntry.fullPath,
      entries: []
    };
    var dirReader = fSysEntry.createReader();
    readEntriesThenPost();

    function readEntriesThenPost() {      console.log('readEntriesThenPost called.');
      dirReader.readEntries(function (entryBatch) {
        if (entryBatch.length > 0) {
          entryBatch.forEach(function (fSysEntry) {
            folderObj.entries.push(pkgEntryData(fSysEntry));
          });
          readEntriesThenPost();
        } else {
          objHandler(folderObj, fileTxtHandler);
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

  function logFolderData(folderObj, fileTxtHandler) {     //console.log('logFolderData called. folderObj = %O', folderObj);
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

  function saveFileEntry(fSysEntry, objHandler, fileTxtHandler) {
    chrome.fileSystem.getWritableEntry(fSysEntry, function (writableEntry) {
      if (writableEntry) {
        writeFileEntry(reqPkg, writableEntry);
      } else {
        postMsg('statusMsg', 'No writable entry');
      }
    });
  }

  function writeFileEntry(reqPkg, writableEntry) {
    var fileBlob = new Blob([reqPkg.fileText], {type: 'text/plain'});
    writableEntry.createWriter(function(writer) {
      writer.onerror = errorHandler;
      writer.onwriteend = function () {
            postMsg('statusMsg', 'File ' + reqPkg.fSysEntry.name + ' saved');
          };
        writer.truncate(fileBlob.size);
        waitForIO(writer, function() {
            writer.seek(0);
            writer.write(fileBlob);
          });
    }, errorHandler);
  }


  function createNewFile(reqPkg) {
    chrome.fileSystem.getWritableEntry(reqPkg.fSysEntry, function(writableFolderEntry) {
      writableFolderEntry.getFile(reqPkg.name, {create:true}, function(fileEntry) {
        fileEntry.createWriter(function(writer) {
          writer.write(new Blob([reqPkg.fileText], {type: 'text/plain'}));
          postMsg('statusMsg', 'File ' + reqPkg.fSysEntry.name + ' saved');
        });
      });
    });
  }

  function createNewFolder(reqPkg) {
    chrome.fileSystem.getWritableEntry(reqPkg.fSysEntry, function(writableFolderEntry) {
      writableFolderEntry.getDirectory(reqPkg.name, {create:true}, function(folderEntry) {
        postMsg('statusMsg', 'Folder ' + reqPkg.name + ' created');
      });
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

