(function() {
	"use strict";
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
		entity: {},
		extrctedCols: {},
		rcrdsWithNullUnqKeyField: {},
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


	function validate(fSysId, recrdsAry, entityType) {
		var entityType = entityType || "location";
		addEntityInfoToResultsObj();
		var hdrs = entityCols[entityType].cols;
		var unqField = entityCols[entityType].unqKey;

		var extrctdRcrdsAry = extractCols(recrdsAry, hdrs);
		var deDupdRecrdsAry = deDupIdenticalRcrds(extrctdRcrdsAry);   console.log("deDupdRecrdsAry = %O", deDupdRecrdsAry);
		var recrdObjsByUnqKey = restructureIntoRecordObj(deDupdRecrdsAry, unqField);
		var filledRecrds = autoFillAndCollapseRecords(recrdObjsByUnqKey); console.log("filledRecrds = %O", filledRecrds);

		// var conflictedRecords = hasConflicts(filledRecrds, unqField);
		ein.ui.show(fSysId, JSON.stringify(conflictObj, null, 2));

		function addEntityInfoToResultsObj() {
			conflictObj.entity ={
				type: entityType,
				uniqueField: entityCols[entityType].unqKey
			};
		}
	}

	/**
	 * Takes an array of record objects, extracts specified columns/keys and values,
	 * returning an array of record objects with that data.
	 *
	 * @param  {obj} recrdsAry An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the recrdsAry
	 * @return {array}  An array of record objects with only the specified columns and their data.
	 */
	function extractCols(recrdsAry, columns) {					//	console.log("extractCols called. recrdsAry = %O", recrdsAry);

	  var extrctdObjs = recrdsAry.map(function(recrd){
	  	return extract(columns, recrd);
		});  																						console.log("Extracted object = %O", extrctdObjs);
		conflictObj.extrctedCols = columns.length;
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
		columns.forEach(function (col){ newRcrd[col] = recrd[col]; });
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

		removeDups(recrdsAry); // console.log("cleanRecrds w no dups = %O", processed);
		updateConflctObjWithDupResults();      console.log("%s duplicates", dupCount);
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
				isDup = isDuplicate(recrd, procesd);
				return isDup;
			});
			return isDup;
		}

		function updateConflctObjWithDupResults() {
			conflictObj.duplicates.push({
				recieved: recrdsAry.length,
				removed: dupCount,
				returned: processed.length
			});
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
		var firstKey = Object.keys(recrdOne)[2];
		var isDup = false;
		if (recrdOne[firstKey] === recrdTwo[firstKey]) {			// If the first key values are identical
			isDup = true;
			checkEachKey(recrdOne, recrdTwo);
		}
		return isDup;

		function checkEachKey(recrdOne, recrdTwo) {
			for (var key in recrdOne) {															// Loop through each key/value in the matching records
				if (recrdOne[key] !== recrdTwo[key]) {								// If a value is unique this is not an exact duplicate
					isDup = false;			//		console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
					break;
				}
			}
		}
	} /* End isDuplicate */

	function restructureIntoRecordObj(recrdsAry, unqField) {
		var rcrdsWithNullUnqField = [];
		var recrdObjsByUnqKey = {};

		sortRecords(recrdsAry);
		updateConflctObjWithRestructureResults();
		return recrdObjsByUnqKey;

		function sortRecords(recrdsAry) {
			recrdsAry.map(function(recrd){
				ifHasUnqFieldValue(recrd, unqField);
			});  console.log("restructureIntoRecordObj = %O", recrdObjsByUnqKey);
			console.log("rcrdsWithNullUnqField = %O", rcrdsWithNullUnqField);
		}
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
				recrdObjsByUnqKey[recrd[unqField]] = [];
				addModRecord(recrd, unqField);
			}
		}
		function addModRecord(recrd, unqField) {
			var unqKey = recrd[unqField];
			delete recrd[unqField];
			recrdObjsByUnqKey[unqKey].push(recrd);
		}
		function updateConflctObjWithRestructureResults() {
			conflictObj.rcrdsWithNullUnqKeyField = {
				recordCnt: rcrdsWithNullUnqField.length,
				records: rcrdsWithNullUnqField
			};
		}
	} /* End restructureIntoRecordObj */

	function autoFillAndCollapseRecords(recrdsObj) {
		var recordsRecieved = countRecrdsInObj(recrdsObj);  console.log("autoFillAndCollapseRecords recrods recieved ", recordsRecieved);
		// var notFillCandidates = {};
		var candidates = isolateCandidatesToFill(recrdsObj);      console.log("candidates = %O. ", candidates); // console.log("noFillRecs = %O", noFillRecs);
		candidates.cands = fillCandidatesIfAble(candidates.cands);

		console.log("candidates after Fill = %O", candidates);
		var processedRcrds = rebuildRecrdsObj(candidates);  console.log("processedRcrds = %O", processedRcrds);
		updateConflctObjWithFillResults();

		return processedRcrds;

		function updateConflctObjWithFillResults() {
			conflictObj.autoFill = {
				recieved: countRecrdsInObj(recrdsObj),
			  filled: conflictObj.autoFill.filledRecsCnt,
			  collapsed: calculateDiff(),
			  remaining: countRecrdsInObj(processedRcrds)
		  };
		}
		function countRecrdsInObj(obj) {
			var ttlRecs = 0;
			for (var key in obj) { ttlRecs += obj[key].length; }
			return ttlRecs;
		}
		function calculateDiff() {
			return countRecrdsInObj(recrdsObj) - countRecrdsInObj(processedRcrds);
		}
	}

		function isolateCandidatesToFill(recrdsObj) {
			var candsObj = {
				cands: {},
				nonCands: {}
			};
			for (var key in recrdsObj) { sortOutCandidates(key); }

			return candsObj;

			function sortOutCandidates(key) {
				recrdsObj[key].length > 1 ? candsObj.cands[key] = recrdsObj[key] : candsObj.nonCands[key] = recrdsObj[key];
			}
		} /* End isolateCandidatesForFill */
		function fillCandidatesIfAble(candidates) {						console.log("fillCandidatesIfAble candidates = %O", candidates);
			var filledRecrdsObj = {};
			var candidateArys = Object.keys(candidates);
			conflictObj.autoFill.filledRecsCnt = 0;

			candidateArys.forEach(function(key){
				checkAndFill(key);
				filledRecrdsObj[key] = deDupIdenticalRcrds(candidates[key]);
			});
			return filledRecrdsObj;

			function checkAndFill(key) {
				var processed = [];
				var noFill = true;
				candidates[key].forEach(function(recrd){
					processRecrd(recrd);
				});
				function processRecrd(recrd) {
					noFill = true;
					checkAlrdyProcessed(recrd);
					processed.push(recrd);
				}
				function checkAlrdyProcessed(recrd) {
					processed.every(function(procesd){ return fillIfNoConflictingData(recrd, procesd); });
				}
				function fillIfNoConflictingData(recrd, procesd) {
					if (!isConflicted(recrd, procesd, key)) { return fillNullFields(recrd, procesd); }
					return noFill;
				}
				function fillNullFields(rcrdOne, rcrdTwo) {
					fillNulls(rcrdOne, rcrdTwo);
					fillNulls(rcrdTwo, rcrdOne);
					if ( JSON.stringify(rcrdOne) === JSON.stringify(rcrdTwo) ) {
						noFill = false;
						conflictObj.autoFill.filledRecsCnt += 2;
					}
					return noFill;
				}
			} /* End checkAndFill */

			function collapseDups(key) {
				var deDupdAry = deDupIdenticalRcrds(candidates[key]);
				return deDupdAry;
			}
		} /* End fillCandidatesIfAble  */

		function fillNulls(trgtRcrd, srcRcrd) {
			for (var key in trgtRcrd) {
				if (trgtRcrd[key] === null) { trgtRcrd[key] = srcRcrd[key]; }
			}
		}
		function rebuildRecrdsObj(candidates) {
			var newObj = {};
			for (var topKey in candidates) { combineRecrds(candidates[topKey]); }

			return newObj;

			function combineRecrds(recrdsObj) {
				for (var aryKey in recrdsObj){ newObj[aryKey] = recrdsObj[aryKey]; }
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
			for (var key in recrd) {																						// Loop through each key/value in the matching records
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
}());