(function() {
  /*
   * Global App Namespace
   * @type {object}
   */
	var ein = ECO_INT_NAMESPACE;
	/**
   * Parse API member on global namespace
   * @type {Object}
   */
	ein.parse = {
		csvObjShow: csvObjShowWrapper,
		show: prepToShow
	}
	/**
	 * Takes an array of record objects, extracts specified columns/keys and values, returning
	 * an array of record objects with only the specified columns and their data.
	 *
	 * @param  {obj} csvObj An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the csvObj
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(csvObj, columns) {
	  var extrctdObjs = csvObj.map(function(recrd){
	  	var newRcrd = {};
	  	columns.forEach(function(col){										// For each specified column
				newRcrd[col] = recrd[col];												// extract related data
			});
			return newRcrd;																	  // modified record added to the new modified object
		});
		return extrctdObjs;
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
				if (recrd[firstKey] === procesd[firstKey]) {				// If the first key value is a duplicate
					isDup = true;
					for (key in recrd) {															// Loop through each key/value in the matching records
						if (recrd[key] !== procesd[key]) {								// If a value is unique
							isDup = false;																	// This is not a duplicate
							break;																					// Break this loop and continue
						}
					}
				}																									// If record is an exact duplicate of a record already processed,
			});																										// Increase duplication count and continue.
			isDup ? dupCount++ : processed.push(recrd);  				// If record is unique in any way, add to records already processed.
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
	function deDupRecrdsByFild(csvObj, unqField) {
		var processed = [];
		var dups = [];
		var dupRecrds = csvObj.filter(function(recrd){					// Will be set to a collection of individual records identified as a duplicate
			var isDup = false;
			processed.forEach(function(procesd) { 									// Loop through each record already processed.
				if (recrd[unqField] === procesd[unqField]) {						// If a value is not unique,
					isDup = true;
					dups.push([recrd, procesd]);													// add both matching records as an array-wrapped pair to the dup collection.
				}
			});
			processed.push(recrd);																	// Add record to processed records.
			if (isDup) {																						// If this record has been identified as a dupicate,
				return true;																						// add record to the filtered collection.
			} else {
				return false;
			}
		});
		return dups;																						// Returning the collection of duplicated pairs
	}
	/**
	 * Wrapper to recieve and pass on raw csv file text from file system.
	 */
	function csvObjShowWrapper(fSysId, text) {
		ein.csvHlpr.csvToObject(fSysId, text, ein.parse.show);
	}
	/**
	 * Container for execution stack leading to ui.show command
	 * Not in any sensical order, just as I left it with testing various returns.
	 */
	function prepToShow(fSysId, csvObj) {
		var extractedRcrds = extractCols(csvObj, ["Short Name", "Last"]);
		var conflictData = deDupRecrdsByFild(extractedRcrds, "Last");
		var deDupdRcrds = deDupIdenticalRcrds(extractedRcrds);
		ein.ui.show(fSysId, JSON.stringify(conflictData, null, 2));
	}
	/**
	 * Currently just logging... Not sure exactly what order things are ultimately going to be consumed in.
	 */
	function procssRemvdCols(modObj, rmvdColData){
		console.log("modObj = %O, rmvdColData = %O", modObj, rmvdColData);
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