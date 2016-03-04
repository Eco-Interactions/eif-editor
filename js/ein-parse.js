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
	/**
	 * Object describing conflicts that arose during the parse process.
	 * @type {Object}
	 */
	var conflictObj = {
		rcrdsWithNullUnqKeyField: {},
		extrctedCols: {},
		duplicates: [],
		autoFill: {},
		conflicts: {}
	};
	/**
   * Parse API member on global namespace
   * @type {Object}
   */
	ein.parse = {
		conflicts: 0,
		csvObjWrapper: csvObjShowWrapper,
		execute: validate
	}


	function validate(fSysId, recrdsAry, entityType) {	//	console.log(arguments);
		var entityType = entityType || "location";
		var hdrs = entityCols[entityType].cols;
		var unqField = entityCols[entityType].unqKey;

		var extrctdRcrdsAry = extractCols(recrdsAry, hdrs);
		var deDupdRecrdsAry = deDupIdenticalRcrds(extrctdRcrdsAry);   console.log("deDupdRecrdsAry = %O", deDupdRecrdsAry);

		var recrdObjsByUnqKey = restructureIntoRecordObj(deDupdRecrdsAry, unqField);
		var filledRecrds = autoFillAndCollapseRecords(deDupdRecrdsAry); console.log("filledRecrds = %O", filledRecrds);
		// var conflictedRecords = hasConflicts(filledRecrds, unqField);
		ein.ui.show(fSysId, JSON.stringify(recrdObjsByUnqKey, null, 2));
	}

	/**
	 * Takes an array of record objects, extracts specified columns/keys and values,
	 * returning an array of record objects with that data.
	 *
	 * @param  {obj} recrdsAry An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the recrdsAry
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(recrdsAry, columns) {						//console.log("extractCols called.");

	  var extrctdObjs = recrdsAry.map(function(recrd){
	  	return extract(columns, recrd);
		});  																						console.log("Extracted object = %O", extrctdObjs);
		conflictObj.extrctedCols = {
			num: columns.length,
	//		columns: columns
		}
		return extrctdObjs;
	}
	/**
	 * Builds a new record from copied values of specified columns from an original record.344
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
	  var isDup = false;
	  var dupCount = 0;
	  var processed = [];

		removeDups(recrdsAry);  console.log("cleanRecrds w no dups = %O", processed);
		updateConflctObj();
			console.log("%s duplicates", conflictObj.duplicates);
		return processed;
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

		function updateConflctObj() {
		conflictObj.duplicates.push({
			recieved: recrdsAry.length,
			removed: dupCount,
			returned: processed.length
		});
	}
	}  /* End of deDupIdenticalRcrds */



		function restructureIntoRecordObj(recrdsAry, unqField) {
			var rcrdsWithNullUnqField = [];
			var recrdObjsByUnqKey = {};
			recrdsAry.map(function(recrd){
				ifHasUnqFieldValue(recrd, unqField);
			});  console.log("restructureIntoRecordObj = %O", recrdObjsByUnqKey);
			console.log("rcrdsWithNullUnqField = %O", rcrdsWithNullUnqField);
			conflictObj.rcrdsWithNullUnqKeyField = {
				recordCnt: rcrdsWithNullUnqField.length,
				records: rcrdsWithNullUnqField
			}
			return recrdObjsByUnqKey;

			function ifHasUnqFieldValue(recrd, unqField) {
				if (!recrdWithNullUnqFld(recrd, unqField)){
					sortIntoKeyedArrays(recrd, unqField);
				}
			}
			function recrdWithNullUnqFld(recrd, unqField) {
				if (recrd[unqField] === null){
					rcrdsWithNullUnqField.push(recrd);
					return true;
				} else { return false; }
			}
			function sortIntoKeyedArrays(recrd, unqField) {
				if (recrd[unqField] in recrdObjsByUnqKey) {
					addModRecord(recrd, unqField);
				} else {
					recrdObjsByUnqKey[recrd[unqField]] = []; console.log("adding key = %s", recrd[unqField]);
					addModRecord(recrd, unqField);
				}
			}
			function addModRecord(recrd, unqField) {
				var key = recrd[unqField];
				delete recrd[unqField];
				recrdObjsByUnqKey[key].push(recrd);
			}
		} /* End restructureIntoRecordObj */


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
			isDup = true;			//	console.log("firstKeys Equal")
			for (key in recrdOne) {															// Loop through each key/value in the matching records
				if (recrdOne[key] !== recrdTwo[key]) {								// If a value is unique this is not an exact duplicate
					isDup = false;			//		console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
					break;
				}
			}
		}
		return isDup;
	}

	function autoFillAndCollapseRecords(recrdsAry, unqField) {
		// var recrdsAry = clone(origRecrdsAry);
		var candidates = {};
		var noFillRecs = isolateCandidatesToFill(recrdsAry, unqField);      console.log("candidates = %O. noFillRecs = %O", candidates, noFillRecs); // console.log("noFillRecs = %O", noFillRecs);
		var filledRecs = fillCandidatesIfAble();
		var unqFilledRecs = deDupIdenticalRcrds(filledRecs);
		var finalCnflctsAry = noFillRecs.concat(unqFilledRecs);

		conflictObj.autoFill = {
			recieved: recrdsAry.length,
			filled: filledRecs.length,
			collapsed: filledRecs.length - unqFilledRecs.length,
			remaining: finalCnflctsAry.length
		};

		return noFillRecs.concat(unqFilledRecs);
/*-----------------------------Helper Functions----------------------------------------------------------- */

		function isolateCandidatesToFill(recrdsAry, unqField) {
			var processed = [];
			processed.push(recrdsAry.pop());

			var potenlUnqFields = recrdsAry.filter(function(recrd){		//		console.log("New record = %O", recrd);		// For each record
				return findCandidates(recrd);
			});



			return finalPassForNoFillRcrds();

			function findCandidates(recrd) {
				var candidate = false;

				processed.some(function(procesd) {							//		console.log("autoFillRecords processing. recrd[unqField] = %O procesd[unqField] = %O", recrd[unqField], procesd[unqField]);											// Loop through each record already processed
					return findUnqKeyDups(recrd, procesd);
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
					}		//console.log("[1]candidate %s. recrd = %s, proc = %s", candidate, recrd[unqField], procesd[unqField]);
					return candidate;
				}
				function addCandidates(recrd, procesd) {
					candidates[recrd[unqField]].push(recrd, procesd);
					candidate = true;
				}
			} /* End findCandidates */

			function finalPassForNoFillRcrds(argument) {
				var noFillRecs = potenlUnqFields.filter(function(recrd){
					return rmvLftovrCandidates(recrd);
				});
				return noFillRecs;
			}

			function rmvLftovrCandidates(recrd) {
				var isNotCandidate = true;
				for (key in candidates){
						ifNowCandidate(recrd);
				}
				return isNotCandidate;

				function ifNowCandidate(recrd) {
					if (recrd[unqField] === key) {
							isNotCandidate = false;
							candidates[recrd[unqField]].push(recrd);
					}
				}
			} /* End rmvLftovrCandidates */
		} /* End isolateCandidatesForFill */
		function fillCandidatesIfAble(argument) {
			var candidateKeys = Object.keys(candidates);

			candidateKeys.forEach(function(key){
				checkAllCandidatesWithKey(key);
			});
			var filledRecs = finalCollapse();

			return filledRecs;

			function checkAllCandidatesWithKey(key) {
				var processed = [];
				var noFill = true;
				candidates[key].forEach(function(recrd){
					noFill = true;
					checkAlrdyProcessed(recrd);
					processed.push(recrd);
				});


				function checkAlrdyProcessed(recrd) {							//	console.log("BEFORE----JSON.stringify(recrd) = ", JSON.stringify(recrd));
					processed.every(function(procesd, i){// console.log("----------------JSON.stringify(procesd) = ", JSON.stringify(procesd));
						return fillIfNoConflictingData(recrd, procesd, i);
					});
				}

				function fillIfNoConflictingData(recrd, procesd, i) {
					if (!isConflicted(recrd, procesd, unqField)) {
						return fillAndCollapse(recrd, procesd, i);									//	console.log("AFTER FILL-------------------JSON.stringify(procesd) = ", JSON.stringify(procesd));console.log("-------------JSON.stringify(recrd) = ", JSON.stringify(recrd));
					}  //console.log("noFill recrd = %O, procesd = %O", recrd, procesd);
					return noFill;
				}
				function fillAndCollapse(rcrdOne, rcrdTwo, i) { //console.log("fillAndCollapse. recrdOne = %O. recrdTwo = %O", rcrdOne, rcrdTwo);
					fillNulls(rcrdOne, rcrdTwo);
					fillNulls(rcrdTwo, rcrdOne);
					if ( JSON.stringify(rcrdOne) === JSON.stringify(rcrdTwo) ) {
						noFill = false;
					}
					return noFill;
				} /* End fillAndCollapse */
			} /* End checkAllCandidatesWithKey */

			function finalCollapse() {
				var allRecords = [];
				for (key in candidates) {
					candidates[key].forEach(function(recrd) {
						allRecords.push(recrd);
					});
				}		//console.log("allRecords", allRecords);
				return allRecords;
			}
		} /* End fillCandidatesIfAble  */
	} /* End autoFillRecords */

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
	function hasConflicts(recrdsAry, unqField) { 							 console.log("hasConflicts called. recrdsAry = %O",recrdsAry);
		// var recrdsAry = clone(origRecrdsAry);
		var conflicted = false;
		var processed = {};

		var conflictedRecrds = recrdsAry.forEach(function(recrd){					// For each record
			conflicted = false;
			// if (recrd[unqField] === null) { return hasNullUnqField(recrd); }
			findConflicts(recrd);
			// if (!conflicted) {processed.push(recrd);}
			return conflicted;														// Conflicted records are added to the new conflicted records object.
		});
		// addConflictsToFeedbackObj(); 		console.log("%s conflicts = %O", conflictedRecrds.length, conflictedRecrds);
		return ;


		function findConflicts(recrd) {
			if (recrd[unqField] in processed) {
			  processed[recrd[unqField]].some(function(procesd) {																	// Loop through each record already processed
					conflicted = isConflicted(recrd, procesd, unqField);															// Returns true, and ends loop, if conflict is identified.
					// conflicted ?
					return conflicted;
				});
			} else {
				processed[recrd[unqField]] = [];
				processed[recrd[unqField]].push(recrd);
			}
		}

		// function addConflictsToFeedbackObj() {
		// 	conflictObj.conflicts = {
		// 		recieved: recrdsAry.length,
		// 		rcrdsWithUniqueFields: processed.length,
		// 		conflicted: conflictedRecrds.length,
		// 		conflictedRcrds: conflictedRecrds
		// 	};
		// }

	}		/* End of hasConflicts */
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
				if (recrd[key] !== null && procesd[key] !== null) {				// If a value is unique,
					if (recrd[key] !== procesd[key]) {
						conflicted = true;																							// This is a conflicted record.
						break;
					}
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

	function clone(recrdsAry) {
		if (recrdsAry instanceof Array) {
      var copy = [];
      for (var i = 0, len = recrdsAry.length; i < len; i++) {
        copy[i] = recrdsAry[i];
      }
      var copyJSON = JSON.stringify(copy);
      return JSON.parse(copyJSON);
    }
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
		// /**
		//  * Removes any record with only null or undefined values.
		//  *
		//  * @param  {array} processed Array of unique record objects.
		//  * @return {array}           Array of record objects with data in one or more fields.
		//  */
		// function removeNullRcrds(processed) {
		// 	var recrds = processed.filter(function(recrd){
		// 		if (!isNullRecrd(recrd)) { return true; } //else { console.log("Null Record to be removed = %O", recrd) }
		// 	});
		// 	return recrds;
		// }
		// *
		//  * Checks every field in a record for nonNull values.
		//  *
		//  * @param  {object}  recrd   Record currently being checked for null fields
		//  * @return {boolean}         Returns true only if every field is null

		// function isNullRecrd(recrd) {
		// 	var isNull = true;
		// 	for (key in recrd) {
		// 		if (recrd[key] !== null && recrd[key] !== undefined) {
		// 			isNull = false;  // console.log("not null or undefined field", recrd[key]);
		// 			break;
		// 		}
		// 	}
		// 	return isNull;
		// }

}());