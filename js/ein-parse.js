(function() {
	"use strict";
	var parseChain, entityObj;
    /* Global App Namespace */
	var ein = ECO_INT_NAMESPACE;
	/* Columns relevant to the each Entity */
	var entityCols = {
		location: {
			unqKey: 'LocDesc',
			cols:	['LocDesc', 'Elev', 'ElevRangeMax', 'Lat', 'Long', 'Region', 'Country', 'HabType']
		},
		publication: {
			unqKey: 'PubTitle',
			cols:	['PubTitle', 'PubType','Publisher']
		},
	};
	var entityParams = {		//++++====++++++=+++++++++++++++++++============
		location: {
			unqKey: 'LocDesc',
			cols:	['LocDesc', 'Elev', 'ElevRangeMax', 'Lat', 'Long', 'Region', 'Country', 'HabType'],
			parseChain: [],
			valMetaData: {}
		},
		publication: [],
		authors: {
			unqKey: 'ShortName',
			parseMethods: [deDupIdenticalRcrds, restructureIntoRecordObj, autoFillAndCollapseRecords, hasConflicts],
			valMetaData: {}
		},
	};
	/* Parse API member on global namespace */
	ein.parse = {
		extractCols: extractCols,
		deDupIdenticalRcrds: deDupIdenticalRcrds,
		restructureRecrdObjs: restructureIntoRecordObj,
		autoFill: autoFillAndCollapseRecords,
		findConflicts: hasConflicts,
		parseChain: recieveCSVAryReturn
	};
	function recieveCSVAryReturn(fSysId, recrdsAry, entity) {
		entityObj = entityParams[entity];
		parseChain = entityObj.parseMethods;  console.log("parseChain = %O", parseChain);
		entityObj.fSyId = fSysId;

		recurParseMethods(recrdsAry, entity);
	}
	function recurParseMethods(recrds, entity) {  console.log("recurParseMethods called. recrds = %O", recrds);
		var curMethod = parseChain.shift();
		curMethod !== undefined ?
				curMethod(recrds, entity, recurParseMethods) :
				ein.ui.show(entityObj.fSyId, JSON.stringify(entityObj,null,2)) ;  	console.log("recurParseMethods complete. metaData = %O", entityObj.valMetaData);
	}
	/**
	 * Takes an array of record objects and extracts specified columns/keys and values.
	 *
	 * @param  {obj} recrdsAry  An array of record objects
	 * @param  {array} columns  One or more columns to be extracted from the recrdsAry
	 * @callback 				        Passes on an array of record objects with only the specified data and an object with result data.
	 */
	function extractCols(entityType, recrdsAry, callback) {
		var columns = entityCols[entityType].cols;																								//	console.log("extractCols called. recrdsAry = %O", recrdsAry);
	  var extrctdObjs = recrdsAry.map(function(recrd){ return extract(columns, recrd); });		console.log("Extracted object = %O", extrctdObjs);

		callback(buildExtrctResultObj());
		/**
		 * [buildExtrctResultObj description]
		 * @return {[type]} [description]
		 */
		function buildExtrctResultObj() {
			var resultObj = {
				extractCols: {
					unqField: entityCols[entityType].unqKey,
					extrctedCols: columns.length
				},
				content: extrctdObjs
			};
			return resultObj;
		}
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
		columns.forEach(function (col){ newRcrd[col] = recrd[col]; });
		return newRcrd;
	}

	function deDupIdenticalRcrds(recrdsAry, entity, callback) {  //============================================================================
		var unqRecords = findUnqRecords(recrdsAry);  console.log("deDupIdenticalRcrds adding meta data now.");
		addDeDupMetaData();
		callback(unqRecords, entity);
		/**
		 * Adds data related to the duplication removal to the validation results.
		 */
		function addDeDupMetaData() {
			entityObj.valMetaData.duplicateResults = {
				received: recrdsAry.length,
				returned: unqRecords.length,
				hasDups: recrdsAry.length === unqRecords.length ? false : true
			};
		}
	}
	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates,
	 * and any entirely null records, removed.
	 *
	 * @param  {array} recrdsAry 	An array of record objects
	 * @return {array}  					Returns an array of unique, and non-null, record objects.
	 */
	function findUnqRecords(recrdsAry) {																																	//	console.log("deDupIdenticalRcrds called. Original Records = %O", recrdsAry);
	  var isDup = false, dupCount = 0, processed = [];

		removeDups(recrdsAry);		   console.log("%s duplicates", dupCount);
		return processed;
	/*----------------Helper Functions for deDupIdenticalRcrds------------------------------------------------------------ */
		/**
		 * Each record is checked against every previously processed ({@link checkAgainstProcessed})
		 * If unique, the record is added to the processed array; otherwise, it increments the duplicate count.
		 *
	 	 * @param  {array} recrdsAry 	An array of record objects
		 */
		function removeDups(recrdsAry) {
			recrdsAry.forEach(function(recrd){
				isDup = checkAgainstProcessed(recrd);
				isDup ? dupCount++ : processed.push(recrd);
			});
		}
		/**
		 * Checks a record against every previously processed record for an exact duplicate record.
		 *
		 * @param  {object}  recrd   Record currently being checked for duplication
		 * @return {bool}       	 True if duplicate is found
		 */
		function checkAgainstProcessed(recrd) {
			processed.some(function(procesd) {
				isDup = isDuplicate(recrd, procesd);
				return isDup;
			});
			return isDup;
		}
	} /* End of deDupIdenticalRcrds */
	/**
	 * If first keys are identical, calls {@link checkEachKey }
	 *
	 * @param  {object}  recrd   Record currently being checked for uniqueness
	 * @param  {object}  procesd Previously processed record being checked against
	 * @return {boolean}         Returns true only if every field in both records are identical.
	 */
	function isDuplicate(recrdOne, recrdTwo) {																														//  console.log("recrds... 1 =%O, 2 = %O", recrdOne, recrdTwo);
		var firstKey = Object.keys(recrdOne)[2], isDup = false;

		if (recrdOne[firstKey] === recrdTwo[firstKey]) {
			isDup = true;
			checkEachKey(recrdOne, recrdTwo);
		}
		return isDup;
		/**
	   * Checks whether two records contain identical data in every field.
	   *
	   * @param  {object} recrdOne   Record currently being checked for uniqueness
		 * @param  {object} recrdTwo   Processed record being checked against
		 */
		function checkEachKey(recrdOne, recrdTwo) {
			for (var key in recrdOne) {															// Loop through each key/value in the matching records
				if (recrdOne[key] !== recrdTwo[key]) {								// If a value is unique this is not an exact duplicate
					isDup = false;			//		console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
					break;
				}
			}
		}
	} /* End isDuplicate */
	/**
	 * Head of method chain that seperates records into an object of arrays grouped under their unique key field. ====================================================================
	 * @param  {array} recrdsAry 	An array of record objects
	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
	 * @return {object}           An object of arrays grouped under their unique key field.
	 */
	function restructureIntoRecordObj(recrdsAry, entity, callback) {
		var rcrdsWithNullUnqField = [], recrdObjsByUnqKey = {};
		var unqField = entityObj.unqKey;
		sortRecords(recrdsAry);
		addNullRecsMetaData();					console.log("restructureIntoRecordObj entityObj= %O", entityObj);
		callback(recrdObjsByUnqKey, entity);
		/**
		 * For each of the records, checks {@link ifHasUnqFieldValue }
	   * @param  {array} recrdsAry 	An array of record objects
		 */
		function sortRecords(recrdsAry) {
			recrdsAry.forEach(function(recrd){
				ifHasUnqFieldValue(recrd, unqField);
			});  							console.log("restructureIntoRecordObj = %O", recrdObjsByUnqKey);        console.log("rcrdsWithNullUnqField = %O", rcrdsWithNullUnqField);
		}
		/**
		 * Check if {@link recrdWithNullUnqFld } and, if unqField has a value, adds this record to that key's array.
		 * @param  {object}  recrd   Record currently being sorted
	 	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
		 */
		function ifHasUnqFieldValue(recrd, unqField) {
			if (!recrdWithNullUnqFld(recrd, unqField)){
				sortIntoKeyedArrays(recrd, unqField);
			}
		}
		/**
		 * Checks if the unique field is null and, if so, adds record to the null records array.
		 * @param  {object}  recrd    Record currently being sorted
	 	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
		 * @return {boolean}          Returns true if unique field is null
		 */
		function recrdWithNullUnqFld(recrd, unqField) {
			if (recrd[unqField] === null){
				rcrdsWithNullUnqField.push(recrd);
				return true;
			} else { return false; }
		}
		/**
		 * Checks if unique field value exists as key in new record object, adds it if not, and adds the record to that array.
		 *
		 * @param  {object}  recrd    Record currently being sorted
	 	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
		 */
		function sortIntoKeyedArrays(recrd, unqField) { // console.log("sorting into keyed arrays")
			if (recrd[unqField] in recrdObjsByUnqKey) {
				addModRecord(recrd, unqField);
			} else {
				recrdObjsByUnqKey[recrd[unqField]] = [];
				addModRecord(recrd, unqField);
			}
		}
		/**
		 * Deletes the unqKey field from record and adds it to array for that unique key
		 *
		 * @param  {object}  recrd    Record currently being sorted
	 	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
		 */
		function addModRecord(recrd, unqField) {
			var unqKey = recrd[unqField]; //console.log("unqKey = ", unqKey);
			delete recrd[unqField];
			recrdObjsByUnqKey[unqKey].push(recrd);   //console.log(" pushing to recrdObjsByUnqKey = %O", recrdObjsByUnqKey);
		}
		/**
		 * Adds data related to restructuring the object to the validation results. ============================================
		 */
		function addNullRecsMetaData() {
			entityObj.valMetaData.rcrdsWithNullUnqKeyField = {
				recordCnt: rcrdsWithNullUnqField.length
			};
		}
	} /* End restructureIntoRecordObj */
	/**
	 * Head of method chain resulting in records that share unqKey values, and also have no conflicting data,==============================================
	 * being bi-directionally filled and any thus duplicate records removed.
	 *
	 * @param  {object} recrdsObj An object with each record sorted into arrays under keys of their unique field values.
	 * @return {object}           An object with any records applicable filled and collapsed
	 */
	function autoFillAndCollapseRecords(recrdsObj, entity, callback) {
		var collapsedCnt, filledRecsCnt;
		var processedRcrds = {};
		var recordsRecieved = countRecrdsInObj(recrdsObj);  												console.log("autoFillAndCollapseRecords recds recieved ", recordsRecieved);
		fillCandidatesIfAble(isolateCandidatesToFill(recrdsObj));
    addAutoFillAndCollapseMetaData();
		callback(processedRcrds, entity);

		/**
		 * Adds data related to autoFill and collapse to the validation results.
		 */
		function addAutoFillAndCollapseMetaData() {
			entityObj.valMetaData.autoFill = {
		  	received: countRecrdsInObj(recrdsObj),
		  	filled: filledRecsCnt,
		  	collapsed: collapsedCnt,
		  	remaining: countRecrdsInObj(processedRcrds)
		  };
		}
		/**
		 * For each of the record arrays grouped by shared unique key value,
		 *
		 * @param  {object} recrdsObj An object with each record sorted into arrays under keys of their unique field values.
		 * @return {object}           Object with two keyed arrays: fill candidates and non-candidates
		 */
		function isolateCandidatesToFill(recrdsObj) {
			var fillCandidates = {};
			for (var key in recrdsObj) { sortOutCandidates(key); }
			return fillCandidates;
			/**
			 * If array has more than one record it is added to the candidates for fill array, added to the non-candidates otherwise.
			 * @param  {string} key Key for an array of record objects
			 */
			function sortOutCandidates(key) {
				recrdsObj[key].length > 1 ? fillCandidates[key] = recrdsObj[key] : processedRcrds[key] = recrdsObj[key];
			}
		} /* End isolateCandidatesForFill */
		/**
		 * Head of method chain that will check each collection of records {@link forEachRecAry} grouped by unique key for conflicting data
		 * If no conflicts, the records are mutually filled and resulting duplicates removed.================================
		 *
		 * @param  {object} candidates  Object with arrays of records with fill potential.
		 * @return {object}							Record object with any records, that could be, filled and collapsed.
		 */
		function fillCandidatesIfAble(candidates) {						console.log("fillCandidatesIfAble candidates = %O", candidates);
			filledRecsCnt = 0;
			collapsedCnt = 0;
			forEachRecAry(Object.keys(candidates));
			/**
			 * For each array of records, calls {@link checkAndFill }. After any records that can be are filled,
			 * removes resulting duplicate records {@link deDupIdenticalRecords }
			 *
			 * @param  {array} candidateAryKeys  Array of top keys for sorted record arrays
			 */
			function forEachRecAry(candidateAryKeys) {
				candidateAryKeys.forEach(function(key){
				  checkAndFill(key);
				  processedRcrds[key] = findUnqRecords(candidates[key]);
				  collapsedCnt += candidates[key].length - processedRcrds[key].length;
			  });
			}
			/**
			 * For each record in the array, {@link processRecrd } for fill potential
			 *
			 * @param  {string} key  unqField value share by all record in the array.
			 */
			function checkAndFill(key) {
				var processed = [], noFill = true;

				candidates[key].forEach(function(recrd){
					processRecrd(recrd);
				});
				/**
				 * Calls {@link checkAlrdyProcessed }, which fills if able, and adds record to those already processed.
				 *
			   * @param  {object}  recrd  Record currently being checked for fill potential.
				 */
				function processRecrd(recrd) {
					noFill = true;
					checkAlrdyProcessed(recrd);
					processed.push(recrd);
				}
				/**
				 * Fo every record already processed, calls {@link fillIfNoConflictingData }.
				 *
			   * @param  {object}  recrd  Record currently being checked for fill potential.
				 */
				function checkAlrdyProcessed(recrd) {
					processed.every(function(procesd){ return fillIfNoConflictingData(recrd, procesd); });
				}
				/**
				 * If records have no conflicting data, calls {@link fillNullFields } for both records.
				 *
			   * @param  {object}  recrd    Record currently being checked for fill potential.
			   * @param  {object}  procesd  Record currently being checked against for fill potential.
				 * @return {boolean}          Returns true if record has unique data, and thus was not able to be filled.
				 */
				function fillIfNoConflictingData(recrd, procesd) {
					if (!isConflicted(recrd, procesd, key)) { return fillNullFields(recrd, procesd); }
					return noFill;
				}
				/**
				 * Calls {@link fillNulls } on both records and checks to ensure records are identical after fill.
				 *
			   * @param  {object}  rcrdOne  Record identified as identical, excepting nulls, from recordTwo.
			   * @param  {object}  rcrdTwo  Record identified as identical, excepting nulls, from recordOne.
				 */
				function fillNullFields(rcrdOne, rcrdTwo) {
					fillNulls(rcrdOne, rcrdTwo);
					fillNulls(rcrdTwo, rcrdOne);
					if ( JSON.stringify(rcrdOne) === JSON.stringify(rcrdTwo) ) {
						noFill = false;
						filledRecsCnt += 2;
					}
				}
			} /* End checkAndFill */
			/**
			 * Calls {@link deDupIdenticalRcrds } on the candidate array after records that could be filled were.
			 *
			 * @param  {string} key  unqField value share by all record in the array.
			 * @return {array}       Array of unique records
			 */
			function collapseDups(key) {
				var deDupdAry = deDupIdenticalRcrds(candidates[key]);
				return deDupdAry;
			}
		} /* End fillCandidatesIfAble  */

	} /* End autoFillAndCollapseRecords */
	/**
	 * Copies valid data from srcRcrd to any field in trgtRcrd with null as its value.
	 *
   * @param  {object}  trgtRcrd  Record identified as identical, excepting nulls, to srcRcrd.
   * @param  {object}  srcRcrd   Record identified as identical, excepting nulls, to trgtRcrd.
	 */
	function fillNulls(trgtRcrd, srcRcrd) {
		for (var key in trgtRcrd) {
			if (trgtRcrd[key] === null) { trgtRcrd[key] = srcRcrd[key]; }
		}
	}
	/**
	 * Checks for records with identical unique fields and conflicting data in other fields.
	 * Returns an object representing these conflicting records.
	 *
	 * @param  {object} recrdsObj An object with each record sorted into arrays under keys of their unique field values.
	 * @param  {string} unqField  A key that should be unique in each record
	 * @return {object}  					Returns an object with shared unqFields as top keys for conflicting record object arrays.
	 */
	function hasConflicts(recrdsObj, entity, callback) { 																    console.log("hasConflicts called. recrdsObj = %O",recrdsObj);
		var processed, postProcessConflicted;
		var conflicted = false;
		var conflictedRecrds = checkEachRcrdAry();						console.log("conflicts = %O", conflictedRecrds);
		addConflictMetaData();
		callback(conflictedRecrds, entity);
		/**
		 * For each record array, calls {@link hasConflictedRcrds } then {@link joinConflicted }
		 *
		 * @return {object}       Returns an object with shared unqFields as top keys for conflicting record object arrays.
		 */
		function checkEachRcrdAry() {
			var conflictedObj = {};
			for (var unqFieldAryKey in recrdsObj) {
				processed = [], postProcessConflicted = [];
				var hasConflicts = hasConflictedRcrds(recrdsObj[unqFieldAryKey], unqFieldAryKey);
				joinConflicted();
			}
			return conflictedObj;
			/**
			 * If there are conflicted records, join the collected conflict records
			 * with the records passed during first round processing.
			 */
			function joinConflicted() {
				if (hasConflicts.length > 0){
					conflictedObj[unqFieldAryKey] = hasConflicts.concat(postProcessConflicted);
				}
			}
		}
		/**
		 * Filter out and return the records with conflicts in their data. {@link findConflicts }
		 *
		 * @param  {array} recrdsAry  An array of records sharing the same unqKey value.
		 * @param  {string} unqField  A key that should be unique in each record
		 * @return {array}            Returns an array of records with confirmed conflicts with records previously processed.
		 */
		function hasConflictedRcrds(recrdsAry, unqField) {
			var conflictedRcrds = recrdsAry.filter(function(recrd){
				conflicted = false;
				conflicted = findConflicts(recrd, unqField);
				return conflicted;
			});
			return conflictedRcrds;
		}
		/**
		 * Check each record already processed for conflicts with the record being processed, {@link @checkForConflicts }.
		 *
		 * @param  {object}  recrd    Record currently being checked for conflicts
		 * @param  {string} unqField  A key that should be unique in each record
		 * @return {boolean}          Returns True if a conflict is found
		 */
		function findConflicts(recrd, unqField) {
			processed.some(function(procesd){															// Loop through each record already processed
				conflicted = checkForConflicts(recrd, procesd, conflicted);  console.log("conflicted = ", conflicted);
				ifConflictedGrabThisProcesdRcrd(procesd);
				return conflicted;
			});
			if (conflicted) {
				return true;
			} else { processed.push(recrd); }
			/**
			 * If a conflict was found with this pair of records, add the previously processed record to its conflict collection.
			 */
			function ifConflictedGrabThisProcesdRcrd(procesd) {
				if (conflicted) {
				  if (postProcessConflicted.indexOf(procesd) === -1) { postProcessConflicted.push(procesd); }
				}
			}
		}
		/**
		 * Adds data related to any conflicts found to the validation results.
		 */
		function addConflictMetaData() {
			entityObj.valMetaData.conflicts = {
				received: countRecrdsInObj(recrdsObj),
				rcrdsWithUniqueFields: calculateDiff(recrdsObj, conflictedRecrds),
				conflictedCnt: countRecrdsInObj(conflictedRecrds),
				conflictedRecrds: conflictedRecrds
			};
		}
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
			conflicted = checkForConflicts(recrd, procesd, conflicted);
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
	function checkForConflicts(recrd, procesd, conflicted) {
		for (var key in recrd) {																						// Loop through each key/value in the matching records
			if (recrd[key] !== null && procesd[key] !== null) {			//	console.log("checkForConflicts:  recrd[key]=%O procesd[key]=%O ",recrd[key] ,procesd[key]);
				if (recrd[key] !== procesd[key]) {
					conflicted = true;																							// This is a conflicted record.
					break;
				}
			}
		}
		return conflicted;
	}
	/**
	 * Counts the number of records in an object of keyed arrays.
	 *
	 * @param  {object}  obj Object of keyed arrays.
	 * @return {int}     Number of records in the object.
	 */
	function countRecrdsInObj(obj) {
		var ttlRecs = 0;
		for (var key in obj) { ttlRecs += obj[key].length; }
		return ttlRecs;
	}
	/**
	 * Calculates the difference of record objects of keyed arrays.
	 *
	 * @param  {object}  obj1  Object of keyed arrays.
	 * @param  {object}  obj2  Object of keyed arrays.
	 * @return {int}           The difference of records between the objects.
	 */
	function calculateDiff(obj1, obj2) {
		console.log("calculateDiff")
		return countRecrdsInObj(obj1) - countRecrdsInObj(obj2);
	}


/*----------------------------Not In Use----------------------------------------------------------------------------------*/
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