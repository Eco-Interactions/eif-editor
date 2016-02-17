(function(){
  var cacheBustVer = "001";
  var postMsg, postStorage;
  var runLocal = defineLocalCommands();
  window.addEventListener('message', localMsgHandler, false);
  document.addEventListener("DOMContentLoaded", onDomLoaded, false);

  function defineLocalCommands() {
    return {
      reload: function () { chrome.runtime.reload() },
      getStorage: function () { chrome.storage.local.get(null, postStorage) },
      setStorage: function (params) { chrome.storage.local.set(params) },
      unsetStorage: function (params) { chrome.storage.local.remove(params); console.log('unsetStorage params:%s', params); },
      getFileSysId: function (params) { userSelectFileSys(params) },
      getFileObj: function (params) { fileSysRequest(params, postFileObj) },
      saveFile: function (params) { fileSysRequest(params, saveFileEntry) },
      createFile: function (params) { fileSysRequest(params, createNewFile) },
      getFolderData: function (params) { fileSysRequest(params, postFolderData) },
      createFolder: function (params) { fileSysRequest(params, createNewFolder) }
    };    
  }

  function localMsgHandler(msg) {
    console.log('localMsgHandler called. cmd: %s & params:%O', msg.data.cmd, msg.data.params);
    console.log('localMsgHandler called msg:%O', msg);
    runLocal[msg.data.cmd](msg.data.params);
  }

  function onDomLoaded() {
    var webviewWin;
    var sandbox = document.getElementById('web-view').contentWindow;
    var webviewElem = document.getElementById('web-view');
    chrome.storage.local.set({ cacheBustVer: cacheBustVer })
//    webviewElem.clearData(0, { appcache: true });
    webviewElem.addEventListener('contentload', function() {
        webviewWin = webviewElem.contentWindow;
        postMsg = function (msgTag, msgContent) {
            webviewWin.postMessage({ tag: msgTag, content: msgContent }, 'http://localhost');
          };
        postStorage = postMsg.bind(null, 'initApp');
        chrome.storage.local.get(null, postStorage);
      });
  }

  /* ============================================================== */
  /* === File System Access Point functions ======================= */
  /* ============================================================== */

  /* requsts a user gesture to select a file or folder (depending on * 
   * params passed) and posts the ID to the sandbox                  */
  function userSelectFileSys(params) {
    chrome.fileSystem.chooseEntry(params, function (fSysEntry) {
      var fSysId = chrome.fileSystem.retainEntry(fSysEntry);
      asyncErr() || postMsg('fileSysId', fSysId);
    });
  }

  function fileSysRequest(params, entryHandler) {  // console.log('fileSysRequest - params: %O', params);
    var reqPkg = {
        fSysId: params.fSysId,
        entryHandler: entryHandler,
        fileText: params.fileText,
        name: params.name
      };                          //    console.log('fileSysRequest - reqPkg: %O', reqPkg);
    fSysEntryFromId(reqPkg);
  }

  /* ============================================================== */
  /* === File System Entry Handler functions ====================== */
  /* ============================================================== */

  function postFileObj(reqPkg) {                              //    console.log('postFileObj called. reqPkg%O', reqPkg);
    asyncErr() || reqPkg.fSysEntry.file(function (fileObj) {
      postMsg('fileObj', pkgFSysResponse(reqPkg, fileObj));
    });   
  }

  function postFolderData(reqPkg) { // console.log('postFolderData called. reqPkg%O', reqPkg);
    if (reqPkg.fSysEntry.isDirectory) {
      reqPkg.folderPkg = pkgFolder(reqPkg);
      readFolderData(reqPkg);
    } else {
      folderReadFail(fSysEntry);
    }
  }

  function saveFileEntry(reqPkg) {  // TODO convert to reqPkg
    chrome.fileSystem.getWritableEntry(reqPkg.fSysEntry, function (writableEntry) {
      if (writableEntry) {
        writeFileEntry(reqPkg, writableEntry);
      } else {
        postMsg('statusMsg', 'No writable entry');
      }
    });
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

  function fSysEntryFromId(reqPkg) {
    var fSysId = reqPkg.fSysId;
    chrome.fileSystem.isRestorable(fSysId, function(isRestorable) {
      if (isRestorable) {
        chrome.fileSystem.restoreEntry(fSysId, function(fSysEntry) {
          if (!asyncErr())  {
            reqPkg.fSysEntry = fSysEntry;
            reqPkg.entryHandler(reqPkg);  // console.log('restored entry = ', fSysEntry);
          }
        });
      } else {
        postMsg('fileObj', pkgFSysResponse(reqPkg, null));
      }
    });  
  }

  function pkgFSysResponse(reqPkg, responseObj) {
    return { fSysId: reqPkg.fSysId, responseObj: responseObj };
  }

  function pkgFolder(reqPkg) {
    var responseObj = { fSysId: reqPkg.fSysId, path: reqPkg.fSysEntry.fullPath, entries: [] };
    return pkgFSysResponse(reqPkg, responseObj);
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

  function readFolderData(reqPkg) {
    var dirReader = reqPkg.fSysEntry.createReader();
    var readComplete = false;
    readEntriesThenPost();
    
    function readEntriesThenPost() {
      dirReader.readEntries (function (entryBatch) {
        if (entryBatch.length > 0) {
          entryBatch.forEach(function (fSysEntry) {
            reqPkg.folderPkg.responseObj.entries.push(pkgEntryData(fSysEntry));        
          });
          readEntriesThenPost();
        } else {
          postMsg('folderData', reqPkg.folderPkg);
        }
      }, errorHandler);      
    }
  }

  function pkgEntryData(fSysEntry) {
    return {
        name: fSysEntry.name,
        fSysId: chrome.fileSystem.retainEntry(fSysEntry),
        isFile: fSysEntry.isFile,
        path: fSysEntry.fullPath
      };
  }

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
        postMsg('statusMsg', asynchErrorMsgDict[chrome.runtime.lastError.message]);
      } else {
        console.log('local error caught. errorObj:%O', chrome.runtime.lastError);
        postMsg('statusMsg', 'Local Error - see console for details');
      }
      return true;
    } else {
      return false;
    }    
  }

  function folderReadFail(folderEntry) {
    console.log('Expected folder entry, instead recieved:%O', folderEntry);
    postMsg('statusMsg', 'Tried to read folder contents but obj is not a folder entry. See console for details.');    
  }

  function errorHandler(e) {
    console.error(e);
    postMsg('statusMsg', 'An Error occurred. See Console for details.');
  }

}());  /* end of namespacing anonymous IIFE */
