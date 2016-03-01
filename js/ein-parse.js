(function() {
  /*
   * Global App Namespace
   * @type {object}
   */
	var ein = ECO_INT_NAMESPACE;
	/* Columns relevant to the Location Entity */
	var locCols = ['LocationDescription',	'Elev',	'ElevRangeMax', 'Lat', 'Long', 'Region', 'Country',	'HabitatType'];
	/**
   * Parse API member on global namespace
   * @type {Object}
   */
	ein.parse = {
		conflicts: 0,
		csvObjWrapper: csvObjShowWrapper,
		execute: conflictStack
	}
	/**
	 * Takes an array of record objects, extracts specified columns/keys and values,
	 * returning an array of record objects with that data.
	 *
	 * @param  {obj} csvObj An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the csvObj
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(csvObj, columns) {						console.log("extractCols called.");
	  var extrctdObjs = csvObj.map(function(recrd){
	  	var newRcrd = {};
	  	columns.forEach(function(col){										// For each specified column
				newRcrd[col] = recrd[col];												// extract related data
			});
			return newRcrd;																	  // modified record added to the new object
		});  																						console.log("Extracted object = %O", extrctdObjs);
		return extrctdObjs;
	}
	/**
	 * This checks for conflicted data in a records object; Either because the unique field given is null,
	 * or records with identical unique fields have conflicting data in other fields
	 *
	 * @param  {array} recrdsObj An array of record objects
	 * @param {string} unqField  A key that should be unique in each record
	 * @return {array}  Returns an array of conflicted record objects.
	 */
	function findConflicts(recrdsObj, unqField) { 							 console.log("findConflicts called. recrdsObj = %O", recrdsObj);
		var conflicted = false;
		var processed = [{}];
		processed[0][unqField] = "";			// A stub init obj used for first round comparisons.

		var conflictedRecrds = recrdsObj.filter(function(recrd){					// For each record
			conflicted = false;
			if (recrd[unqField] === null) { return true; }										// If the unique field is null, this record is conflicted.
			processed.some(function(procesd) {																	// Loop through each record already processed
				return isConflicted(recrd, procesd);															// Returns true, and ends loop, if conflict is identified.
			});
			if (!conflicted) {processed.push(recrd);}
			return ( conflicted ? true : false );														// Conflicted records are added to the new conflicted records object.
		});
		processed.shift();								//Remove init obj
		ein.parse.conflicts = conflictedRecrds.length;      		console.log("%s conflicts = %O", conflictedRecrds.length, conflictedRecrds);
		return conflictedRecrds;

	/*----------------Helper Functions for findConflicts----------------------------------------------------------------------------- */
		/**
		 * Checks if unique fields are identical and, if so, calls {@link checkForConflicts}
		 * Otherwise, adds the record to the processed array.
		 *
		 * @param  {object}  recrd   Record currently being checked for conflicts
		 * @param  {object}  procesd Previously processed record being checked against
		 * @return {Boolean}				 Returns true if conflicts have been found.
		 */
		function isConflicted(recrd, procesd) {
			if (recrd[unqField] === procesd[unqField]) {			// If the unique key values are identical
				checkForConflicts(recrd, procesd);
			}
			return conflicted;
		}
		/**
		 * Takes two records with identical unique fields and checks for conflicts in remaining data fields.
		 * If there are no conflicts, the records are identical and will be collapsed at a later point
		 *
		 * @param  {object}  recrd   Record currently being checked for conflicts
		 * @param  {object}  procesd Previously processed record being checked against
		 */
		function checkForConflicts(recrd, procesd) {
			for (key in recrd) {																						// Loop through each key/value in the matching records
				if (recrd[key] !== null && recrd[key] !== procesd[key]) {				// If a value is unique,
					conflicted = true;																							// This is a conflicted record.
					break;
				}
			}
		}
	}		/* End of findConflicts */
	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates removed.
	 *
	 * @param  {array} csvObj An array of record objects
	 * @return {array}  Returns a copy of the original object with any exact duplicates removed.
	 */
	function deDupIdenticalRcrds(recrdObj) {		console.log("deDupIdenticalRcrds called. recrdObj = %O", recrdObj);
	  var isDup = false;
		var dupCount = 0;
		var firstKey = Object.keys(recrdObj[0])[0];
		var processed = [{}];
		processed[0][firstKey] = "";			// A stub init obj used for first round comparisons.

		recrdObj.forEach(function(recrd){ 											// For each record
			isDup = false;
			processed.some(function(procesd) {											// Loop through each record already processed
				return isDuplicate(recrd, procesd);											// Returns true, and ends loop, if exact duplicate is confirmed.
			});
			isDup ? dupCount++ : processed.push(recrd);						  // If record is unique in any way, add to processed records.
		});
		processed.shift();							//Remove init obj
		var deDupdRecrds  = processed.filter(function(recrd){			// Remove any record that contains ONLY null values
			return nonNullRecrd(recrd);
		});  console.log("deDupdRecrds with Null records removed = %O", deDupdRecrds);
		ein.parse.conflicts = (ein.parse.conflicts - dupCount);		// Update total conflicts that have yet to be addressed
		return deDupdRecrds;
	/*----------------Helper Functions for deDupIdenticalRcrds------------------------------------------------------------ */
		/**
		 * Checks every field in a record for nonNull values.
		 *
		 * @param  {object}  recrd   Record currently being checked for null fields
		 * @return {boolean}         Returns false only if every field is null
		 */
		function nonNullRecrd(recrd) {
			var isNotNull = false;
			for (key in recrd) {
				if (recrd[key] !== null) {
					isNotNull = true;
					break;
				}
			}
			return isNotNull;
		}
		/**
		 * Checks whether two records contain identical data in every field.
		 *
		 * @param  {object}  recrd   Record currently being checked for uniqueness
		 * @param  {object}  procesd Previously processed record being checked against
		 * @return {Boolean}         Returns true only if every field in both records are identical.
		 */
		function isDuplicate(recrd, procesd) {
			if (recrd[firstKey] === procesd[firstKey]) {			// If the first key values are identical
				isDup = true;
				for (key in recrd) {															// Loop through each key/value in the matching records
					if (recrd[key] !== procesd[key]) {								// If a value is unique this is not an exact duplicate
						isDup = false;
						break;
					}
				}
			}
			return isDup;
		}
	}  /* End of deDupIdenticalRcrds */
	/**
	 * Checks that each record has a unique value in the specified unique field. If not, the record is flagged for
	 * duplicated, and potentially conflicting, data.
	 *
	 * @param  {obj}    recrdObj  An array of record objects
	 * @param  {string} unqField  A field that should be unique for each record in the object
	 * @return {array}            An array of record objects with unique field duplications.
	 */
	function deDupRecrdsByField(recrdObj, unqField) {
		var processed = [];
		var dupRecrds = recrdObj.filter(function(recrd){					// Will be set to a collection of individual records identified as potentially conflicting.
			var isDup = false;
			processed.forEach(function(procesd) { 									// Loop through each record already processed.
				if (recrd[unqField] === procesd[unqField]) {						// If the value is not unique,
					isDup = true;																						// flag as duplicate.
				}
			});
			if (!isDup) {processed.push(recrd);}										// If unique field has a unique value, add record to processed records.
			return isDup;																						// If this record has been identified as a dupicate, add record to the duplicates collection.
		});
		return dupRecrds;																				// Returns the collection of duplicated pairs
	}
	/**
	 * Wrapper to recieve and pass on raw csv file text from file system.
	 */
	function csvObjShowWrapper(fSysId, text) {
		ein.csvHlpr.csvToObject(fSysId, text, ein.parse.execute);
	}
	/**
	 * Container for the conflict detection execution stack leading to ui.show command
	 */
	function conflictStack(fSysId, csvObj) {
		var extractedLocRecrds = extractLocCols(csvObj);
		var conflictedRecrds = findConflicts(extractedLocRecrds, locCols[0]);
		var deDupdRecrds = deDupIdenticalRcrds(conflictedRecrds);			console.log("%s conflicts to address", ein.parse.conflicts);
		// var conflictedData = deDupRecrdsByField(deDupdRecrds, locCols[0]);
		ein.ui.show(fSysId, JSON.stringify(deDupdRecrds, null, 2));
	}
	/**
	 * ExtractCols specifically for location columns
	 */
	function extractLocCols(csvObj){  console.log("extractLocCols");
		return extractCols(csvObj, locCols);
	}

/*----------------------------Not Yet In Use----------------------------------------------------------------------------------*/
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

	function autoFillRecords(recrdsObj, unqField) {
		var processed = [{}];
		processed[0][unqField] = "";			// A stub init obj used for first round comparisons.
		var filledRecrds = recrdsObj.map(function(recrd){				console.log("New record = ", recrd);		// For each record
			processed.some(function(procesd) {									console.log("autoFillRecords processing. recrd[unqField] = %O procesd[unqField] = %O", recrd[unqField], procesd[unqField]);											// Loop through each record already processed
				if (recrd[unqField] === procesd[unqField]) {			console.log("the unique key values are identical", recrd[unqField], procesd[unqField]);	// If the unique key values are identical
					recrd = copyAndFillVals(recrd, procesd);
					return true;
				}
			});
			processed.push(recrd);
			return recrd;
		});	//	console.log("filledRecrds", filledRecrds);
		return filledRecrds;
	}

	function copyAndFillVals(rcrdToFill, rcrdToCopy) { console.log("copyAndFillVals. rcrdToFill = %O. rcrdToCopy = %O", rcrdToFill, rcrdToCopy);
		for (key in rcrdToFill) {
			if (rcrdToFill[key] === null) {
				rcrdToFill[key] = rcrdToCopy[key];
			}
		}  console.log("exiting copyAndFillVals. rcrdToFill = %O.", rcrdToFill);
		return rcrdToFill;
	}

	//No side effects (obj remains untransmuted)

	//add button to toolbar that saves entity obj as json
}());