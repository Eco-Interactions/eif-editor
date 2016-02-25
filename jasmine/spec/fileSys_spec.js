var ein = ECO_INT_NAMESPACE;

describe('Allows access to the File System', function() {

	ein.jsmFileSysTsts = {
		ids: progIdData,
		testPassed: false,
    newFileId: ""
	};					console.log(ein.jsmFileSysTsts.ids);
	var fileSysTests = ein.jsmFileSysTsts;

	var testPassed = fileSysTests.testPassed;

  beforeEach(function() {
    fileSysTests.testPassed = false;
  });

  // it("Creates Folders", function(done) {                       GET DIRECTORY METHOD NOT CURRENTLY WORKING. WILL UPDATE TEST-INIT WHEN A GENERATED TEST FOLDER IS AN OPTION
  //  ein.fileSys.getFolderEntry(
  //    fileSysTests.ids.folder,        // Should be the jasmine folder id, the root folder for testing
  //    ein.fileSys.createFolder,       // writeHandler
  //    "Spec Test Folder",             // fileText
  //    function(){                     // success callback
  //      fileSysTests.testPassed = true;
  //      done(expect(fileSysTests.testPassed).toBe(true));
  //    }
  //  )
  // });

  it("Opens and Reads Folders", function(done) {
  	ein.fileSys.entryFromId(
  		fileSysTests.ids.folder,					// Should be the jasmine folder id, the root folder for testing
  		ein.fileSys.getFolderData,				// idHandler
  		ein.fileSys.readFolder,						// objHandler
  		function(spH, folderObj){					// success callback
        // if ()
        console.log("folderObj", folderObj);
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  it("Creates Files", function(done) {
    ein.fileSys.getFolderEntry(
      fileSysTests.ids.folder,        // Should be the jasmine folder id, the root folder for testing
      ein.fileSys.createFile,         // writeHandler
      "Test File",                    // name
      function(fSysId){                     // success callback
        fileSysTests.newFileId = fSysId;        console.log("newFileId", fileSysTests.newFileId);
        fileSysTests.testPassed = true;
        done(expect(fileSysTests.testPassed).toBe(true));
      }
    )
  });

  it("Writes Content to Files", function(done) {
  	ein.fileSys.saveFile(
  		fileSysTests.newFileId,					// Id of file generate in previous test
  		"Jasmine Test File Text",				// fileText
  		function(){											// success callback
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  it("Opens and Reads Files", function(done) {
    ein.fileSys.entryFromId(
      fileSysTests.ids.file,          // Should a csv file chosen for testing
      ein.fileSys.getFileObj,         // idHandler
      ein.fileSys.readFile,           // objHandler
      function(){                     // success callback
        fileSysTests.testPassed = true;
        done(expect(fileSysTests.testPassed).toBe(true));
      }
    )
  });

});

describe('Parses CSVs', function() {

  it("Reads and Parses CSVs into Objects", function(done) {
    ein.fileSys.entryFromId(
      ein.jsmFileSysTsts.ids.file,          // Should a csv file chosen for testing
      ein.fileSys.getFileObj,         // idHandler
      ein.fileSys.readFile,           // objHandler
      function(spH, csvStr){                     // sends CSV string to CSV parse method
        var successful = ein.csvHlpr.csvToObject(spH, csvStr, true);        // spH is a spaceHolder, true indicates to the method this is a test
        if(successful) {        console.log("successful");                    // and tells the method to return true, i.e. successful
          ein.jsmFileSysTsts.testPassed = true;
          done(expect(ein.jsmFileSysTsts.testPassed).toBe(true));
        }
      }
    )
  });
});
// CLEAN UP ein.jsmFileSysTsts. REFERENCES----------------------------------------------