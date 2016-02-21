
describe('Allows access to the File System', function() {
	var ein = ECO_INT_NAMESPACE;

	ein.jsmFileSysTsts = {
		ids: progIdData,
		testPassed: false
	};
	var fileTests = ein.jsmFileSysTsts;

	var testPassed = fileTests.testPassed;

  beforeEach(function() {
    fileTests.testPassed = false;
  });

  it("Opens and Reads Files", function(done) {
  		/* id, idHandler,      objHandler,        fileTxtHandler */
  	ein.fileSys.selectFileById(
  		fileTests.ids.file,
  		ein.fileSys.getFileObj,
  		ein.fileSys.readFile,
  		function(){
  			fileTests.testPassed = true; console.log("successful read and testPassed = ", fileTests.testPassed);
  			done(expect(fileTests.testPassed).toBe(true));
  		}
  	)

  });
});

// describe('Allows users to select a file', function() {

//   it("loads the 'editor text area'", function() {
//     expect(a).toBe(true);
//   });
// });
