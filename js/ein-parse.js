(function() {
  /*
   * Global App Namespace
   * @type {object}
   */
	var ein = ECO_INT_NAMESPACE;
	/**
	 * Columns relevant to the Location Entity
	 */
	var locCols = ['LocationDescription',	'Elev',	'ElevRangeMax', 'Lat', 'Long', 'Region', 'Country',	'HabitatType'];
	/**
   * Parse API member on global namespace
   * @type {Object}
   */
	ein.parse = {
		csvObjShow: csvObjShowWrapper,
		execute: prepToShow
	}
	/**
	 * Takes an array of record objects, extracts specified columns/keys and values, returning
	 * an array of record objects with only the specified columns and their data.
	 *
	 * @param  {obj} csvObj An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the csvObj
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(csvObj, columns) {			console.log("extractCols");
	  var extrctdObjs = csvObj.map(function(recrd){
	  	var newRcrd = {};
	  	columns.forEach(function(col){										// For each specified column
				newRcrd[col] = recrd[col];												// extract related data
			});
			return newRcrd;																	  // modified record added to the new modified object
		});  console.log("extrctdObjs.length", extrctdObjs.length);
		return extrctdObjs;
	}
	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates removed.
	 * @param  {array} csvObj An array of record objects
	 * @return {array}  Returns a copy of the original object with any exact duplicates removed.
	 */
	function findConflictsAndFillRecrds(recrdsObj, unqField) {
		var conflicted = false;
		var hasNulls = false;
		var conflctd = [];
		var processed = [{}];
		processed[0][unqField] = "";			// A stub init obj used for first round comparisons.

		var cleanRecrds = recrdsObj.filter(function(recrd){				console.log("New record = ", recrd);		// For each record
			if (recrd[unqField] === null) { return conflictedRecrd(recrd); }
			processed.every(function(procesd) {								// Loop through each record already processed
				if (unqFieldsAreEqual(recrd, procesd)) {			console.log("recrd[unqField] %O === procesd[unqField] %O", recrd[unqField], procesd[unqField]);	// If the unique key values are identical
					checkForConflictsAndNulls(recrd, procesd);
					if (conflicted) { return false; }
					if (hasNulls) { recrd = copyAndFillVals(recrd, procesd); }			// If record is an exact duplicate of a record already processed,
				}
			});																							// Increase duplication count and continue.
			if (!conflicted){
				processed.push(recrd);
				return true;
			}
		});
		processed.shift();							console.log("processed.length", processed.length);										//Remove init obj
		console.log("%s conflicts = %O", conflctd.length, conflctd);								// Sending dupCount to console for now
		return conflctd;

	/*----------------Helper Functions----------------------------------------------------------------------------- */
		function unqFieldsAreEqual(recrd, procesd) {
			return recrd[unqField] === procesd[unqField];
		}

		function checkForConflictsAndNulls(recrd, procesd) {
			for (key in recrd) {															// Loop through each key/value in the matching records
				if (recrd[key] !== null && recrd[key] !== procesd[key]) {								// If a value is unique
					conflictedRecrd(recrd);
					break;
				} else if (recrd[key] === null){
					hasNulls = true;
					break;
				}
			}
		}
		function conflictedRecrd(recrd) {
			conflicted = true;						console.log("recrd = %O, conflctd = %O, ------------", recrd, conflctd);
			conflctd.push(recrd);
			return false;
		}
	}

	function fillCleanRecrds(recrdsObj) {
			// body...
		}

	function fieldNull(field) {
		return field === null;
	}

	function copyAndFillVals(rcrdToFill, rcrdToCopy) { //console.log("copyAndFillVals. rcrdToFill = %O. rcrdToCopy = %O", rcrdToFill, rcrdToCopy);
		for (key in rcrdToFill) {
			if (rcrdToFill[key] === null) {
				rcrdToFill[key] = rcrdToCopy[key];
			}
		}  console.log("exiting copyAndFillVals. rcrdToFill = %O.", rcrdToFill);
		return rcrdToFill;
	}

	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates removed.
	 * @param  {array} csvObj An array of record objects
	 * @return {array}  Returns a copy of the original object with any exact duplicates removed.
	 */
	function deDupIdenticalRcrds(csvObj) {
		var dupCount = 0;
		var firstKey = Object.keys(csvObj[0])[0];
		var processed = [{}];
		processed[0][firstKey] = "";			// A stub init obj used for first round comparisons.

		csvObj.forEach(function(recrd){ 											// For each record
			var isDup = false;
			processed.forEach(function(procesd) {								// Loop through each record already processed
				dupCheck:
					if (recrd[firstKey] === procesd[firstKey]) {				// If the first key value is a duplicate
						isDup = true;
						for (key in recrd) {															// Loop through each key/value in the matching records
							if (recrd[key] !== procesd[key]) {								// If a value is unique
								isDup = false;																	// This is not a duplicate
								break;																					// Break this loop and continue
							}
						}
						if (isDup) {
							dupCount++;
							break dupCheck;
						};																									// If record is an exact duplicate of a record already processed,
					}
			});																							// Increase duplication count and continue.
			if (!isDup) { processed.push(recrd); }  				// If record is unique in any way, add to records already processed.
		});
		processed.shift();																	//Remove init obj
		console.log("dupCount = ", dupCount);								// Sending dupCount to console for now
		return processed;
	}
	/**
	 * Takes an array of record objects and a field that should be unique for each record in the object
	 * Returns a multi-dimensional array with inner arrays of object pairs of conflicting data
	 *
	 * @param  {obj} csvObj  An array of record objects
	 * @param  {string} unqField  A field that should be unique for each record in the object
	 * @return {array}            A two-dimensional array with inner arrays of object pairs of conflicting data
	 */
	function deDupRecrdsByField(csvObj, unqField) {
		var processed = [];
		var dupRecrds = csvObj.filter(function(recrd){					// Will be set to a collection of individual records identified as a duplicate
			var isDup = false;
			processed.forEach(function(procesd) { 									// Loop through each record already processed.
				if (recrd[unqField] === procesd[unqField]) {						// If a value is not unique,
					isDup = true;
				}
			});
			processed.push(recrd);																	// Add record to processed records.
			if (isDup) {																						// If this record has been identified as a dupicate,
				return true;																						// add record to the filtered collection.
			} else {
				return false;
			}
		});   console.log("DeDupByField. Conflicted = ", dupRecrds.length);
		return dupRecrds || "No Conflicted Records";																						// Returning the collection of duplicated pairs
	}
	/**
	 * Wrapper to recieve and pass on raw csv file text from file system.
	 */
	function csvObjShowWrapper(fSysId, text) {
		ein.csvHlpr.csvToObject(fSysId, text, ein.parse.execute);
	}
	/**
	 * Container for execution stack leading to ui.show command
	 * Not in any sensical order, just as I left it with testing various returns.
	 */
	function prepToShow(fSysId, csvObj) {
		// var deDupdRecrds = deDupIdenticalRcrds(csvObj);
		// var recrds = attachTempIds(deDupdRecrds);
		var extractedLocRecrds = extractLocCols(csvObj);
		var cleanedAndFilled = findConflictsAndFillRecrds(extractedLocRecrds, locCols[0]);
		var conflictedData = deDupRecrdsByField(cleanedAndFilled, locCols[0]);
		ein.ui.show(fSysId, JSON.stringify(conflictedData, null, 2));
	}
	/**
	 * Attach temporary Ids incrementally to record objects so extracted data can be linked to the original record.
	 * @param  {array} recrdObj Colletion of record objects.
	 * @return {array} A new collection of record objects with a tempId property
	 */
	function attachTempIds(recrdObj) {  	console.log("attachTempIds");
		var id = 1;
		var newRecrds = recrdObj.map(function(recrd){
			recrd.tempId = id++;
			return recrd;
		});
		return newRecrds;
	}

	/**
	 * ExtractCols specifically for location columns
	 */
	function extractLocCols(csvObj){  console.log("extractLocCols");
		return extractCols(csvObj, locCols);
	}

	//No side effects (obj remains untransmuted)

	//extract col-(recrdObj, column name)			take pubs from cit, replace with reference to pub objAry
		//return ([col vals], newModObj)

	//deDupCol ([vals])
		//.filter
		//return [uniqValsAry]

	//deDupByUnqFld							i.e. Locations
		//conflicts prompt for resolution


	//addTmpIds (recrdObj)
		//adds 'tmpId' field to each record with incremented integer (non-zero: idx++)
		//
		//return newRcrdObj

	//add button to toolbar that saves entity obj as json
}());