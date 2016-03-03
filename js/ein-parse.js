(function() {
  /*
   * Global App Namespace
   * @type {object}
   */
	var ein = ECO_INT_NAMESPACE;
	/* Columns relevant to the each Entity */
	var entityCols = {
		location: {
			unqKey: "LocationDescription",
			cols:	['LocationDescription', 'Elev', 'ElevRangeMax', 'Lat', 'Long', 'Region', 'Country', 'HabitatType']
		}
	}
	var conflictObj = {};
	/**
   * Parse API member on global namespace
   * @type {Object}
   */
	ein.parse = {
		conflicts: 0,
		csvObjWrapper: csvObjShowWrapper,
		execute: validate
	}


	function validate(fSysId, recrdsAry, entityType) {		console.log(arguments);
		var entityType = entityType || "location";
		var hdrs = entityCols[entityType].cols;
		var unqField = entityCols[entityType].unqKey;

		var extrctdRcrdsAry = extractCols(recrdsAry, hdrs);
		var deDupdRecrdsAry = deDupIdenticalRcrds(extrctdRcrdsAry);   console.log("deDupdRecrdsAry = %O", deDupdRecrdsAry);
		// var filledRecrds = autoFillRecords(deDupdRecrdsAry, unqField); console.log("filledRecrds = %O", filledRecrds);
		// var findConflicts(deDupdRecrdsAry, unqField);
	}

	/**
	 * Takes an array of record objects, extracts specified columns/keys and values,
	 * returning an array of record objects with that data.
	 *
	 * @param  {obj} recrdsAry An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the recrdsAry
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(recrdsAry, columns) {						console.log("extractCols called.");
	  var extrctdObjs = recrdsAry.map(function(recrd){
	  	return extract(columns, recrd);
		});  																						console.log("Extracted object = %O", extrctdObjs);
		conflictObj.extractedCols = columns.length;
		return extrctdObjs;
	}
	/**
	 * Builds a new record from copied values of specified columns from an original record.
	 *
	 * @param  {array} columns  Array of columns/keys to copy to new object.
	 * @param  {object}  recrd  Record to copy values from.
	 * @return {object}         New record with only the keys specified and their values.
	 */
	function extract(columns, recrd) {
		var newRcrd = {};
		columns.forEach(function(col){ newRcrd[col] = recrd[col]; });
		return newRcrd;
	}

	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates,
	 * and any entirely null or undefined records, removed.
	 *
	 * @param  {array} recrdsAry 	An array of record objects
	 * @return {array}  					Returns an array of unique and non-null records.
	 */
	function deDupIdenticalRcrds(recrdsAry) {		console.log("deDupIdenticalRcrds called. recrdsAry = %O", recrdsAry);
	  var isDup = false, dupCount = 0, processed = [];

		removeDups(recrdsAry);		 console.log("dupCount", dupCount);  //console.log("cleanRecrds w no dups = %O", processed);
		var cleanRecords = removeNullRcrds(processed);  //  console.log("cleanRecrds w no nulls = %O", cleanRecords);
		conflictObj.duplicates = dupCount + (processed.length - cleanRecords.length);		console.log("%s duplicates", conflictObj.duplicates);
		return cleanRecords;
	/*----------------Helper Functions for deDupIdenticalRcrds------------------------------------------------------------ */
		/**
		 * Each record is checked against every previously processed ({@link checkAgainstProcessed})
		 * If unique, the record is added to the processed array. Otherwise it increments the duplicate count.
		 *
	 	 * @param  {array} recrdsAry 	An array of record objects
		 */
		function removeDups(recrdsAry) {
			recrdsAry.forEach(function(recrd){ 											// For each record
				isDup = checkAgainstProcessed(recrd);				// console.log("[2]isDup %s, recrd = %O", isDup, recrd);
				isDup ? dupCount++ : processed.push(recrd);						  // If record is unique in any way, add to processed records.
			});
		}
		/**
		 * Checks a record against every previously processed record until an
		 * exact duplicate is found.
		 *
		 * @param  {object}  recrd   Record currently being checked for duplication
		 * @return {boolean}       	 True if duplicate is found
		 */
		function checkAgainstProcessed(recrd) {
			processed.some(function(procesd) {
				isDup = isDuplicate(recrd, procesd);				//	console.log("[1]isDup for record = %O", isDup, recrd);
				return isDup;
			});
			return isDup;
		}
		/**
		 * Removes any record with only null or undefined values.
		 *
		 * @param  {array} processed Array of unique record objects.
		 * @return {array}           Array of record objects with data in one or more fields.
		 */
		function removeNullRcrds(processed) {
			var recrds = processed.filter(function(recrd){
				if (!isNullRecrd(recrd)) { return true; } else { console.log("Null Record to be removed = %O", recrd) }
			});
			return recrds;
		}
		/**
		 * Checks every field in a record for nonNull values.
		 *
		 * @param  {object}  recrd   Record currently being checked for null fields
		 * @return {boolean}         Returns true only if every field is null
		 */
		function isNullRecrd(recrd) {
			var isNull = true;
			for (key in recrd) {
				if (recrd[key] !== null && recrd[key] !== undefined) {
					isNull = false;   console.log("not null or undefined field", recrd[key]);
					break;
				}
			}
			return isNull;
		}
	}  /* End of deDupIdenticalRcrds */
	/**
	 * Checks whether two records contain identical data in every field.
	 *
	 * @param  {object}  recrd   Record currently being checked for uniqueness
	 * @param  {object}  procesd Previously processed record being checked against
	 * @return {boolean}         Returns true only if every field in both records are identical.
	 */
	function isDuplicate(recrdOne, recrdTwo) {//  console.log("recrds... 1 =%O, 2 = %O", recrdOne, recrdTwo);
		var firstKey = Object.keys(recrdOne)[0];
		var isDup = false;
		if (recrdOne[firstKey] === recrdTwo[firstKey]) {			// If the first key values are identical
			isDup = true;				console.log("firstKeys Equal")
			for (key in recrdOne) {															// Loop through each key/value in the matching records
				if (recrdOne[key] !== recrdTwo[key]) {								// If a value is unique this is not an exact duplicate
					isDup = false;					console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
					break;
				}
			}
		}
		return isDup;
	}

	function autoFillRecords(recrdsAry, unqField) {
		var candidates = {};

		var noFillRecs = isolateCandidatesForFill(recrdsAry, unqField);      console.log("candidates = %O", candidates); // console.log("noFillRecs = %O", noFillRecs);

		var filledRecs = fillCandidatesIfAble();

		return noFillRecs.concat(filledRecs);
/*-----------------------------Helper Functions----------------------------------------------------------- */
		function isolateCandidatesForFill(recrdsAry, unqField) {
			var noFillRecs = recrdsAry.filter(function(recrd){			//	console.log("New record = ", recrd);		// For each record
				findCandidates(recrd);
			});
			return noFillRecs;

			function findCandidates(recrd) {
				var processed = [], candidate = false;
				processed.push(recrdsAry.pop());

				processed.forEach(function(procesd) {							//		console.log("autoFillRecords processing. recrd[unqField] = %O procesd[unqField] = %O", recrd[unqField], procesd[unqField]);											// Loop through each record already processed
					findUnqKeyDups(recrd, procesd);
				});

				processed.push(recrd);
				if (!candidate) {return true;}

				function findUnqKeyDups(recrd, procesd) {
					if (recrd[unqField] === procesd[unqField]) {		//	console.log("the unique key values are identical", recrd[unqField], procesd[unqField]);	// If the unique key values are identical
						if (recrd[unqField] in candidates) {
							addCandidates(recrd, procesd);
						} else {
							candidates[recrd[unqField]] = [];
							addCandidates(recrd, procesd);
						}
					}
				}
				function addCandidates(recrd, procesd) {
					candidates[recrd[unqField]].push(recrd, procesd);
					candidate = true;
				}
			} /* End findCandidates */
		} /* End isolateCandidatesForFill */
		function fillCandidatesIfAble(argument) {
			var candidateKeys = Object.keys(candidates);
			var filledRecs = [{}];
			filledRecs[unqField] = "";

			candidateKeys.forEach(function(key){					//	console.log("candidates[key] = %O", candidates[key]);
				checkAllCandidatesWithKey(key);
			});
			return filledRecs;

			function checkAllCandidatesWithKey(key) {
				candidates[key].forEach(function(recrd){
					checkFilled(recrd);

					filledRecs.shift();
					console.log("filledRecs.length", filledRecs.length);
				});

				function checkFilled(recrd) {
					filledRecs.forEach(function(procesd){
						fillIfNoConflictingData(recrd, procesd);
					});
				}

				function fillIfNoConflictingData(recrd, procesd) {
					if (!isConflicted(recrd, procesd, unqField)) {
						fillAndCollapse(recrd, procesd);
					}
				}
			} /* End checkAllCandidatesWithKey */
		} /* End fillCandidatesIfAble  */
	} /* End autoFillRecords */



	function fillAndCollapse(rcrdOne, rcrdTwo) { console.log("fillAndCollapse. recrdOne = %O. recrdTwo = %O", rcrdOne, rcrdTwo);
		fillNulls(rcrdOne, rcrdTwo);
		fillNulls(rcrdTwo, rcrdOne);
		if ( JSON.stringify(rcrdOne) === JSON.stringify(rcrdTwo) ) { console.log("Records Equal");
			filledRecs.push(rcrdOne);
		}
	}

	function fillNulls(trgtRcrd, srcRcrd) {
		for (key in trgtRcrd) {
			if (trgtRcrd[key] === null) {
				trgtRcrd[key] = srcRcrd[key];
			}
		}
	}


	/**
	 * This checks for conflicted data in a records object; Either because the unique field given is null,
	 * or records with identical unique fields have conflicting data in other fields
	 *
	 * @param  {array} recrdsAry An array of record objects
	 * @param {string} unqField  A key that should be unique in each record
	 * @return {array}  Returns an array of conflicted record objects.
	 */
	function findConflicts(recrdsAry, unqField) { 							 console.log("findConflicts called. recrdsAry = %O", recrdsAry);
		var conflicted = false;
		var processed = [{}];
		processed[0][unqField] = "";			// A stub init obj used for first round comparisons.

		var conflictedRecrds = recrdsAry.filter(function(recrd){					// For each record
			conflicted = false;
			if (recrd[unqField] === null) { return true; }										// If the unique field is null, this record is conflicted.
			processed.some(function(procesd) {																	// Loop through each record already processed
				return isConflicted(recrd, procesd, unqField);															// Returns true, and ends loop, if conflict is identified.
			});
			if (!conflicted) {processed.push(recrd);}
			return conflicted;														// Conflicted records are added to the new conflicted records object.
		});
		processed.shift();								//Remove init obj
		ein.parse.conflicts = conflictedRecrds.length;      		console.log("%s conflicts = %O", conflictedRecrds.length, conflictedRecrds);
		return conflictedRecrds;
	}		/* End of findConflicts */
	/**
	 * Checks if unique fields are identical and, if so, calls {@link checkForConflicts}
	 *
	 * @param  {object}  recrd   Record currently being checked for conflicts
	 * @param  {object}  procesd Previously processed record being checked against
	 * @return {Boolean}		 Returns true if conflicts have been found.
	 */
	function isConflicted(recrd, procesd, unqField) {
		var conflicted = false;
		if (recrd[unqField] === procesd[unqField]) {			// If the unique key values are identical
			checkForConflicts(recrd, procesd);
		}
		return conflicted;
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
	 * Checks that each record has a unique value in the specified unique field. If not, the record is flagged for
	 * duplicated, and potentially conflicting, data.
	 *
	 * @param  {obj}    recrdsAry  An array of record objects
	 * @param  {string} unqField  A field that should be unique for each record in the object
	 * @return {array}            An array of record objects with unique field duplications.
	 */
	function deDupRecrdsByField(recrdsAry, unqField) {
		var processed = [];
		var dupRecrds = recrdsAry.filter(function(recrd){					// Will be set to a collection of individual records identified as potentially conflicting.
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
	 * Attach temporary Ids incrementally to record objects so extracted data can be linked to the original record.
	 * @param  {array} recrdsAry Colletion of record objects.
	 * @return {array} A new collection of record objects with a tempId property
	 */
	function attachTempIds(recrdsAry) {  	console.log("attachTempIds");
		var id = 1;
		var newRecrds = recrdsAry.map(function(recrd){
			recrd.tempId = id++;
			return recrd;
		});
		return newRecrds;
	}

	//No side effects (obj remains untransmuted)

	//add button to toolbar that saves entity obj as json
	//
	//
	//

}());