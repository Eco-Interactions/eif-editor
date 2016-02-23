
describe('Allows access to the File System', function() {
	var ein = ECO_INT_NAMESPACE;

	ein.jsmFileSysTsts = {
		ids: progIdData,
		testPassed: false
	};					console.log(ein.jsmFileSysTsts.ids);
	var fileSysTests = ein.jsmFileSysTsts;

	var testPassed = fileSysTests.testPassed;

  beforeEach(function() {
    fileSysTests.testPassed = false;
  });

  it("Opens and Reads Files", function(done) {
  	ein.fileSys.entryFromId(
  		fileSysTests.ids.file,					// Id
  		ein.fileSys.getFileObj,					// idHandler
  		ein.fileSys.readFile,						// objHandler
  		function(){											// success callback
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  it("Opens and Reads Folders", function(done) {
  	ein.fileSys.entryFromId(
  		fileSysTests.ids.folder,					// Id
  		ein.fileSys.getFolderData,				// idHandler
  		ein.fileSys.readFolder,						// objHandler
  		function(){												// success callback
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  it("Writes Content to Files", function(done) {
  	ein.fileSys.saveFile(
  		fileSysTests.ids.file,					// Id
  		"Jasmine Test File Text",				// fileText
  		function(){											// success callback
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  it("Creates Files", function(done) {
  	ein.fileSys.getFolderEntry(
  		fileSysTests.ids.folder,				// Id
  		ein.fileSys.createFile,					// writeHandler
  		"Spec Test File", 							// name
  		function(){											// success callback
  			fileSysTests.testPassed = true;
  			done(expect(fileSysTests.testPassed).toBe(true));
  		}
  	)
  });

  // it("Creates Folders", function(done) {
  // 	ein.fileSys.getFolderEntry(
  // 		fileSysTests.ids.folder,				// Id
  // 		ein.fileSys.createFolder,				// writeHandler
  // 		"Spec Test Folder", 						// fileText
  // 		function(){											// success callback
  // 			fileSysTests.testPassed = true;
  // 			done(expect(fileSysTests.testPassed).toBe(true));
  // 		}
  // 	)
  // });

});

// describe('Allows users to select a file', function() {

//   it("loads the 'editor text area'", function() {
//     expect(a).toBe(true);
//   });
// });
