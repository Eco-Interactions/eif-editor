(function() {
	"use strict";
	var parseChain = [], entityObj = {}, validationObj = {};
    /* Global App Namespace */
	var ein = ECO_INT_NAMESPACE;
	/* Parse parameters relevant to each Entity */
	var entityParams = {
		author: {
			name: 'author',
			subEntityCollection: true,
			unqKey: ['shortName'],
			parseMethods: [fillInIds, deDupIdenticalRcrds, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts],
			validationResults: {}
		},
		citation: {
			name: 'citation',
			childEntites: ['publication', 'author'],
			subEntities: ['publication'],
			unqKey: ['citId'],
			splitField: 'author',
			reqRef: 'author', //required reference
			cols:	['citId', 'citShortDesc', 'fullText', 'author', 'title', 'pubTitle', 'year', 'vol', 'issue', 'pgs'],
			parseMethods: [extractCols, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts, splitFieldIntoAry],
			validationResults: {},
			extrctdAuths: {}
		},
		interaction: {			// Taxa are handled in last method: buildAndMergeTaxonObjs
			name: 'interaction',
			childEntites: ['location', 'citation'],
			subEntities: ['location'],
			unqKey: ['id'],
			splitField: 'intTag',
			cols: ['directness', 'citId', 'locDesc', 'intType', 'intTag', 'subjOrder', 'subjFam', 'subjGenus', 'subjSpecies', 'objKingdom', 'objPhylum', 'objClass', 'objOrder', 'objFam', 'objGenus', 'objSpecies'],
			parseMethods: [autoFillLocDesc, fillInIds, extractCols, restructureIntoRcrdsObj, extractTaxaCols, splitFieldIntoAry, mergeSecondaryTags, checkCitId, buildAndMergeTaxonObjs],
			validationResults: {},
			taxaRcrdObjsAry: {}
		},
		location: {
			name: 'location',
			unqKey: ['locDesc'],
			cols:	['locDesc', 'elev', 'elevRangeMax', 'lat', 'long', 'region', 'country', 'habType'],
			parseMethods: [extractCols, deDupIdenticalRcrds, autoFillLocDesc, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts],
			validationResults: {}
		},
		publication: {
			name: 'publication',
			unqKey: ['pubTitle'],
			cols:	['pubTitle','pubType','publisher'],
			parseMethods: [extractCols, deDupIdenticalRcrds, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts],
			validationResults: {}
		},
		taxon: {
			objCols: ['objKingdom', 'objPhylum', 'objClass','objOrder','objFam','objGenus','objSpecies'],
			subjCols: ['subjOrder', 'subjFam', 'subjGenus', 'subjSpecies']
		}
	};
	/* Parse API member on global namespace */
	ein.parse = {
		parseChain: recieveCSVAryReturn,
		mergeDataSet: mergeEntities,
		parseFileSet: parseFileSetRecrds
	};
	/**
	 * Recieves output from the CSVtoObject conversion and calls {@link recurParseMethods} to execute <<<<<<<<<<<<<<<<<<<<<<<
	 * the specified entity's parse method chain.
	 *
	 * @param  {int}  fSysId    file sytem id for the original file opened
	 * @param  {obj} recrdsAry  An array of record objects
	 * @param  {str}  entity    The entity currently being parsed
	 */
	function recieveCSVAryReturn(fSysId, recrdsAry, entity, callback, validMode) { // console.log("entityParams[entity] = %O", entityParams[entity]);
		entityObj = JSON.parse(JSON.stringify(entityParams[entity]));
		entityObj.orgRcrdAryObjs = recrdsAry;				//	console.log("entity = %s, entityObj = %O", entity, entityObj);
		// parseChain = entityObj.parseMethods;
		// entityObj.parseMethods = copyParseChain(entityParams[entity].parseMethods); // console.log("parseChain = %O", parseChain);

		// recurParseMethods(recrdsAry, entity);
		executeParseChain(recrdsAry, entity);
		cleanUpReturnResults(recrds);

		if (validMode) { validationObj[entity] = entityObj; }
																			//		console.log("entityParams[entity] = %O", entityParams[entity]);
		callback(fSysId, entityObj.valResults); //	console.log("recurParseMethods complete. metaData = %O", entityObj.validationResults);
	}
	function copyParseChain(parseMethodChain) {
		return parseMethodChain.map(function(method){ return method });
	}
	function executeParseChain(recrdsAry, entity) {
		var parseMethods = copyParseChain(entityParams[entity].parseMethods); // console.log("parseChain = %O", parseChain);
		parseMethods.forEach(function(curMethod){
			curMethod();														//recrds, entity, recurParseMethods
		});
	}
	/**
	 * Executes the specified entity's parse method chain and sends the results and final records to the screen.
	 *
	 * @param  {obj||ary} recrds  Record objects in either array or object form
	 * @param  {str}  entity    The entity currently being parsed
	 */
	// function recurParseMethods(recrds, entity) {  // console.log("recurParseMethods called. recrds = %O, entity = %s", recrds, entity);
	// 	var curMethod = parseChain.shift();
	// 	if (curMethod !== undefined) {
	// 		curMethod(recrds, entity, recurParseMethods)
	// 	} else {
	//
	// 	}
	// }
	function cleanUpReturnResults(recrdsObj) {   //console.log("entityObj = %O", entityObj)
		entityObj.valResults = {
			name: entityObj.name,
			finalRecords: recrdsObj,
			valRpt : entityObj.validationResults,
			orgRcrdAry: entityObj.orgRcrdAryObjs
		};
		if ("taxaObjs" in entityObj) {  console.log("taxa data being stored = %O", entityObj.taxon.valRpt)
			entityObj.valResults.taxon = {
				taxaObjs: entityObj.taxaObjs,
				valRpt: entityObj.taxon.valRpt			//isEmpty(entityObj.taxon.valRpt) ? null :
			}; // console.log("entityObj.valResults = %O", entityObj.valResults);
		}
	}
	/**
	 * Takes an array of record objects and extracts the specified columns/keys and values.
	 */
	function extractCols() {
		var recrdsAry = entityObj.orgRcrdAryObjs;
		var entityType = entityObj.name;
		var columns = entityObj.cols;																								//	console.log("extractCols called. recrdsAry = %O", recrdsAry);

	  entityObj.curRcrds =  recrdsAry.map(function(recrd){ return extract(columns, recrd); });	//	console.log("Extracted object = %O", extrctdObjs);

		function buildExtrctResultObj() {
			entityObj.validationResults.extractCols = {
				unqField: entityCols[entityType].unqKey,
				extrctedCols: columns.length
			};
		}
	} /* End Extract Cols */
	/**
	 * Builds a new record from copied values of specified columns from an original record.
	 *
	 * @param  {array} columns  Array of columns/keys to copy to new object.
	 * @param  {object}  recrd  Record to copy values from.
	 */
	function extract(columns, recrd) {
		var newRcrd = {};
		columns.forEach(function (col){ newRcrd[col] = recrd[col]; });
		return newRcrd;
	}
	/**
	 * Takes an array of record objects and removes any exact duplicates.
	 */
	function deDupIdenticalRcrds() {
		var recrdsAry = entityObj.curRcrds;

		entityObj.curRcrds = findUnqRecords(entityObj.curRcrds);
		entityObj.validationResults.dupCnt = recrdsAry.length - entityObj.curRcrds.length;
	} /* End deDupIdenticalRcrds */
	/**
	 * Takes an array of record objects and returns a copy of the object with any exact duplicates removed.
	 *
	 * @param  {array} recrdsAry 	An array of record objects
	 * @return {array}  					Returns an array of unique, and non-null, record objects.
	 */
	function findUnqRecords(recrdsAry) {																																	//	console.log("deDupIdenticalRcrds called. Original Records = %O", recrdsAry);
	  var isDup = false, dupCount = 0, processed = [], dupIntIdRefs = {};

		removeDups(recrdsAry);		  // console.log("%s duplicates", dupCount);
		var unqRecrds = removeNulls(processed);
		return unqRecrds;
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
		// function processDup(recrd) {
		// 	var unqKey = entityObj.unqKey;
		// 	dupCount++;
		// 	if (dupIntIdRefs[recrd[unqKey]] === undefined) { dupIntIdRefs[recrd[unqKey]] = []; }
		// 	dupIntIdRefs[recrd[unqKey]].push(recrd.intId);
		// }
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
		function removeNulls(processedRcrds) {
			var nonNullRecs = processedRcrds.filter(function(recrd){ return !isAllNull(recrd); });
			return nonNullRecs;
		}
	} /* End of findUnqRecords */
	function isAllNull(o) {
		var nullObj = true;
		for( var k in o) {
			if (o[k] !== null) { nullObj = false; }
		}
		return nullObj;
	}
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
				// if (key === "intId") { continue }
				if (recrdOne[key] !== recrdTwo[key]) {								// If a value is unique this is not an exact duplicate
					isDup = false;			//		console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
					break;
				}
			}
		}
	} /* End isDuplicate */
	/**
	 * Seperates the array of records into an object of arrays grouped under their unique key field.
	 */
	function restructureIntoRcrdsObj() {			//	console.log("restructureIntoRcrdsObj entityObj= %O", entityObj);
		var unqField, rcrdsWithNullUnqField = [], recrdObjsByUnqKey = {};
		var recrdsAry = entityObj.curRcrds;
		var unqFieldAry = entityObj.unqKey;

		findUnqField();
		sortRecords(recrdsAry);
		addNullRecsMetaData();

		entityObj.curRcrds = recrdObjsByUnqKey;
		/**
		 * Check if the entityObj's unqKey is present in the entity. If not, attach and use tempIds.
		 * (This is only useful currently in the case of interactions where an id from the database may be included).
		 */
		function findUnqField() {
			unqFieldAry.some(function(unqKey){ return ifKeyInRcrds(unqKey); });
			if (unqField === undefined) {
				recrdsAry = attachTempIds(recrdsAry);
				unqField = "tempId";
			}
		}
		function ifKeyInRcrds(unqKey) {
			for (var key in recrdsAry[0]) {
				if (unqKey === key) {
					unqField = unqKey;
					return true;
				}
			}
		}
		/**
		 * For each of the records, checks {@link sortOnUnqField }
	   * @param  {array} recrdsAry 	An array of record objects
		 */
		function sortRecords(recrdsAry) {
			recrdsAry.forEach(function(recrd){
				sortOnUnqField(recrd, unqField);
			});  						//	console.log("restructureIntoRcrdsObj = %O", recrdObjsByUnqKey);        console.log("rcrdsWithNullUnqField = %O", rcrdsWithNullUnqField);
		}
		/**
		 * Check if {@link recrdWithNullUnqFld } and, if unqField has a value, adds this record to that key's array.
		 * @param  {object}  recrd   Record currently being sorted
	 	 * @param  {string} unqField  A field that should, ultimately, be unique for each record
		 */
		function sortOnUnqField(recrd, unqField) {
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
			// delete recrd[unqField];
			recrdObjsByUnqKey[unqKey].push(recrd);   //console.log(" pushing to recrdObjsByUnqKey = %O", recrdObjsByUnqKey);
		}
		/**
		 * Adds data related to restructuring the object to the validation results. ============================================
		 */
		function addNullRecsMetaData() {
			isEmpty(rcrdsWithNullUnqField) ?
				entityObj.validationResults.rcrdsWithNullReqFields = null :
				entityObj.validationResults.rcrdsWithNullReqFields = {
					recordCnt: rcrdsWithNullUnqField.length,
					recrds: rcrdsWithNullUnqField,
					unqKey: entityObj.unqKey
				};
		}
	} /* End restructureIntoRcrdsObj */
	/**
	 * Records that share unqKey values, and no otherwise conflicting data, are bi-directionally filled
	 * and any resulting duplicate records removed.
	 */
	function autoFillAndCollapseRecords() {
		var collapsedCnt, filledRecsCnt;
		var processedRcrds = {};
		var recrdsObj = entityObj.curRcrds;
		var recordsRecieved = countRecrdsInObj(recrdsObj);  											//	console.log("autoFillAndCollapseRecords recds recieved ", recordsRecieved);
		fillCandidatesIfAble(isolateCandidatesToFill(recrdsObj));
    addAutoFillAndCollapseMetaData();

    entityObj.curRcrds = processedRcrds;
		// callback(processedRcrds, entity);

		/**
		 * Adds data related to autoFill and collapse to the validation results.
		 */
		function addAutoFillAndCollapseMetaData() {
			filledRecsCnt === 0 ?
				entityObj.validationResults.autoFill = null :
				entityObj.validationResults.autoFill = {
			  	received: countRecrdsInObj(recrdsObj),
			  	filled: filledRecsCnt,
			  	collapsed: collapsedCnt,
			  	remaining: countRecrdsInObj(processedRcrds)
			  }
		}
		/**
		 * For each of the record arrays grouped by shared unique key value,
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
		 * If no conflicts, the records are mutually filled and resulting duplicates removed.		 *
		 * @param  {object} candidates  Object with arrays of records with fill potential.
		 * @return {object}							Record object with any records, that could be, filled and collapsed.
		 */
		function fillCandidatesIfAble(candidates) {					//	console.log("fillCandidatesIfAble candidates = %O", candidates);
			filledRecsCnt = 0;
			collapsedCnt = 0;
			forEachRecAry(Object.keys(candidates));
			/**
			 * For each array of records, calls {@link checkAndFill }. After any records that can be are filled,
			 * removes resulting duplicate records {@link deDupIdenticalRecords }
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
			 * @param  {string} key  unqField value share by all record in the array.
			 */
			function checkAndFill(key) {
				var processed = [], noFill = true;

				candidates[key].forEach(function(recrd){
					processRecrd(recrd);
				});
				/**
				 * Calls {@link checkAlrdyProcessed }, which fills if able, and adds record to those already processed.
			   * @param  {object}  recrd  Record currently being checked for fill potential.
				 */
				function processRecrd(recrd) {
					noFill = true;
					checkAlrdyProcessed(recrd);
					processed.push(recrd);
				}
				/**
				 * Fo every record already processed, calls {@link fillIfNoConflictingData }.
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
			   * @param  {object}  rcrdOne && rcrdTwo  Records identified as identical, excepting nulls.
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
   * @param  {object}  trgtRcrd && srcRcrd  Records identified as identical, excepting nulls.
	 */
	function fillNulls(trgtRcrd, srcRcrd) {
		for (var key in trgtRcrd) {
			if (trgtRcrd[key] === null) { trgtRcrd[key] = srcRcrd[key]; }
		}
	}
	/**
	 * Records that share unique field values are checked for conflicting data. Conflicted records identified are removed,
	 * as well as all recods that share that unqKey - as the records without conflicts can not be merged until all records
	 * share an unconflicted unqKey reference.
	 */
	function hasConflicts() { 					//	console.log("hasConflicts returned recrdsObj = %O",recrdsObj);
		var processed, conflictedAry;
		var conflicted = false;
		var rcrdsRecieved = countRecrdsInObj(entityObj.curRcrds);
		var conflictedRecrds = checkEachRcrdForConflicts(entityObj.curRcrds);				//console.log("%s conflicts = %O", entity, conflictedRecrds);
		addConflictMetaData();

		function checkEachRcrdForConflicts(recrdsObj) {
			var conflictedRecrdsObj = {};
			for (var unqFieldAryKey in recrdsObj) { // console.log("conflictedAry = %O", conflictedAry);
				processed = [], conflictedAry = [];
				var hasConflicts = hasConflictedRcrds(recrdsObj[unqFieldAryKey], unqFieldAryKey);
				hasConflicts && removeConflictedRecrds(unqFieldAryKey);
			}
			return isEmpty(conflictedRecrdsObj) ? null : conflictedRecrdsObj;
			/**
			 * If there are conflicted records, join the collected conflict records with the records passed during first round processing.
			 */
			function removeConflictedRecrds(unqFieldAryKey) {
				conflictedRecrdsObj[unqFieldAryKey] = getConflictedRcrds(conflictedAry, recrdsObj[unqFieldAryKey]);
				delete recrdsObj[unqFieldAryKey];
			}
		} /* End checkEachRcrdForConflicts */
		function getConflictedRcrds(conflictedAry, recrdsAry) {//console.log("getConflictedRcrds called. arguments = %O", arguments);
			return conflictedAry.map(function(rcrdIdx){ //console.log("conflicted recrd in conflictedAry. recrd in orgAry = %O", recrdsAry[rcrdIdx])
				return recrdsAry[rcrdIdx];
			});
		}
		/**
		 * Filter out and return the records with conflicts in their data. {@link findConflicts }
		 *
		 * @param  {array} recrdsAry  An array of records sharing the same unqKey value.
		 * @param  {string} unqField  A key that should be unique in each record
		 * @return {array}            Returns an array of records with confirmed conflicts with records previously processed.
		 */
		function hasConflictedRcrds(recrdsAry, unqField) {
			recrdsAry.forEach(function(recrd, idx){
				conflicted = false;
				conflicted = findConflicts(recrd, unqField, idx);
			});
			return conflicted;
		}
		/**
		 * Check each record already processed for conflicts with the record being processed, {@link @checkForConflicts }.
		 *
		 * @param  {object}  recrd    Record currently being checked for conflicts
		 * @param  {string} unqField  A key that should be unique in each record
		 * @return {boolean}          Returns True if a conflict is found
		 */
		function findConflicts(recrd, unqField, recrdIdx) {
			processed.some(function(procesd){															// Loop through each record already processed
				conflicted = checkForConflicts(recrd, procesd.recrd, conflicted); // console.log("conflicted = ", conflicted);
				ifConflictedGrabTheseRcrds(procesd.idx, recrdIdx, unqField);
				return conflicted;
			});
			if (conflicted) {
				return true;
			} else { processed.push({ recrd: recrd, idx: recrdIdx }); }
			/**
			 * If a conflict was found with this pair of records, add the previously processed record to its conflict collection.
			 */
			function ifConflictedGrabTheseRcrds(procesdIdx, recrdIdx, unqField) {
				if (conflicted) {
					conflictedAry.push(recrdIdx);
				  if (conflictedAry.indexOf(procesdIdx) === -1) { conflictedAry.push(procesdIdx); }
				}
			}
		} /* End findConflicts */
		/**
		 * Adds data related to any conflicts found to the validation results.
		 */
		function addConflictMetaData() {
			var conflictedCnt = countRecrdsInObj(conflictedRecrds);
			conflictedCnt === 0 ?
				entityObj.validationResults.shareUnqKeyWithConflictedData = null :
				entityObj.validationResults.shareUnqKeyWithConflictedData = {
					received: rcrdsRecieved,
					cleanRecrdsCnt: rcrdsRecieved - conflictedCnt,
					unqKey: entityObj.unqKey[0],
					conCnt: conflictedCnt,
					recrds: conflictedRecrds
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
/*--------------------------- Merge Entities Methods ------------------------------------- */
	function mergeEntities(fSysIdAry, parentEntity, childEntities, callback, prevEntityReslts) { //console.log("mergeEntities called. Arguments = ", arguments);
		var nullRefResults = {}, nullRefChildKeys = [];
		var dataSet = parentEntity.name;
		var parentRcrds = parentEntity.finalRecords;     							//		 console.log("parentRcrds = %O", parentRcrds);
		var parentValRpt = parentEntity.valRpt
		var returnRecrdsObj = prevEntityReslts ?  prevEntityReslts : parentEntity;

		childEntities.forEach(function(subEntityObjMetaData) { replaceRefsWithPointers(subEntityObjMetaData); });
		if (parentValRpt.nullRefResults !== undefined) { removeNullRefRcrds(); }

		callback(fSysIdAry, returnRecrdsObj);

		function replaceRefsWithPointers(childParseResults) { 				//	 console.log("replaceRefsWithPointers. childParseResults = %O", childParseResults);
			var parentEntityRecrd, rcrdsAry;
			var childName = childParseResults.name; //console.log("childName = %s", childName);
			var childRecrds = childParseResults.finalRecords;  				//	 console.log("entityParams = %O", entityParams);
			var isCollection = "subEntityCollection" in entityParams[childName];
			var processMethod = isCollection ? processChildCollection : processSingleChildEntity;

			processParentEntity();

			function processParentEntity() {// console.log("parentRcrds = %O", parentRcrds);
				for (var key in  parentRcrds) {
					parentEntityRecrd = parentRcrds[key][0];
					processMethod(parentEntityRecrd, key); }
			}
			function processChildCollection(parentEntityRecrd, parentKey) { 													// console.log("isCollection")
				var childrenToReplace = parentEntityRecrd[childName]; 										// console.log("childrenToReplace= %O ",childrenToReplace);
				rcrdsAry = [];
				forEachChildInCollection(parentKey);
				replaceWithPointer(rcrdsAry, parentKey);

				function forEachChildInCollection(parentKey) {
					childrenToReplace.forEach(function(childEntityRef){
						matchRefInChildRecrds(childEntityRef, parentKey);
						if (parentValRpt.nullRefResults!== undefined) { addNullRefResults(childName) }
					}); 																																				//  console.log("calling replacedWithPointer. rcrdsAry = %O", rcrdsAry);			}
				}
			} /* End processChildCollection */
			function processSingleChildEntity(parentEntityRecrd, parentKey) {  																// console.log("is not Collection")
			  var refKey = entityParams[childName].unqKey[0];
				var unqKeyValToReplace = parentEntityRecrd[refKey];														//	 console.log("parentEntityRecrd = %O. unqKeyValToReplace = %s", parentEntityRecrd, unqKeyValToReplace);
				ifKeyValueIsNotNullFindKey(parentKey);

				function ifKeyValueIsNotNullFindKey(parentKey) {
					if (unqKeyValToReplace === null) {
						parentEntityRecrd[childName] = null;
						delete parentEntityRecrd[refKey];
					} else { matchRefInChildRecrds(unqKeyValToReplace, parentKey, refKey) } ;// console.log("unqKeyValToReplace = ", unqKeyValToReplace);
				}
			} /* End processSingleChildEntity */
			function matchRefInChildRecrds(unqKeyStrToReplace, parentKey, refKey) {							// If key in obj, grab
				var matched = false;
				for (var childKey in childRecrds) { ifKeyValuesMatch(childKey, unqKeyStrToReplace, refKey); }
				if (!matched) { extractNullRefRecrd(parentKey, unqKeyStrToReplace) }

				function ifKeyValuesMatch(childKey, refVal, refKey) {
					if (childKey == refVal) { 								//	if (childName === "location") {console.log("subEntity record match found. = %O.", childRecrds[childKey]);}
						matched = true;
						isCollection ? rcrdsAry.push(childRecrds[childKey][0]) : replaceWithPointer(childRecrds[childKey][0], refKey); //console.log("foundMatchingSubEntityObj");}
					}
				}
			} /* End matchRefInChildRecrds */
			function extractNullRefRecrd(parentKey, unqKeyStrVal) {				//console.log("extractNullRefRecrd called. parentEntityRecrd = %O, childName = %s, unqKeyStrVal = %s", parentEntityRecrd, childName, unqKeyStrVal)
				if (parentValRpt.nullRefResults === undefined) { parentValRpt.nullRefResults = {}; }
				if (parentValRpt.nullRefResults[childName] === undefined) {
					parentValRpt.nullRefResults[childName] = {};
				}
				parentValRpt.nullRefResults[childName][parentKey] = Object.assign({}, parentRcrds[parentKey]);  //console.log("nullRefResults = %O", nullRefResults);
				if (parentValRpt.nullRefResults[childName][parentKey].nullRefKeys === undefined) {parentValRpt.nullRefResults[childName][parentKey].nullRefKeys = []; }  //console.log("nullRefResults = %O", nullRefResults);
				parentValRpt.nullRefResults[childName][parentKey].nullRefKeys.push(unqKeyStrVal);  //console.log("nullRefResults = %O", nullRefResults);
			}
			function replaceWithPointer(matchedRecrd, refKey) {																					// console.log("replacedWithPointer called. matchedRecrd = %O",matchedRecrd);
				parentEntityRecrd[childName] = matchedRecrd;
				delete parentEntityRecrd[refKey];
			}
		} /* End replaceRefsWithPointers */
		function addNullRefResults(childName) { //console.log("childsName = ", childName)
		  if (parentValRpt.nullRefResults[childName] !== undefined) {// console.log("adding cnt. childName = %s, obj = %O", childName, parentValRpt.nullRefResults[childName])
		  	parentValRpt.nullRefResults[childName].cnt = Object.keys(parentValRpt.nullRefResults[childName]).length;
		  	parentValRpt.nullRefResults[childName].refKey = entityParams[childName].unqKey[0];
		  }
		}
		function removeNullRefRcrds() {
			for (var entity in parentValRpt.nullRefResults) {
				for (var parentKey in parentValRpt.nullRefResults[entity]) {
					delete parentRcrds[parentKey];
				}
			}
		}
	} /* End mergeEntities */
/*--------------Parse File Set Records--------------------------------------------------- */
	/**
	 * Recieves record objs from each of three entity csv files opened (author, citation, and interaction) and, from these,
	 * individual entities and their related data are extracted, redundancies are reduced and any errors identified during
	 * the parsing and validation are flagged and their related records quarantined. The valid records are then merged into
	 * their related interaction records. If in 'valid mode', indicated by the validationMode parameter, the validation result
	 * data objects for each parsed entity are returned along with the final merged records.
	 *
	 * @param  {obj}   fileSetObj       record obj arrays from each of three entity csv files opened (author, citation, and interaction)
	 * @param  {bool}  validationMode   if true, validation result data will be returned
	 * @param  {func}  callback         if in 'validMode', displayValidationresults (toolbar); otherwise, dataGrid.fillData
	 * @param  {func}  setProgress			bound func that updates progress bar and status message
	 * @return {[type]}                  [description]
	 */
	function parseFileSetRecrds(fileSetObj, validationMode, callback, setProgress) { //  console.log("parseFileSetRecrds called. arguments = %O", arguments);
	    var csvRowEntities = ["author", "citation", "interaction"]; // console.log("parseFileSetRecrds. entityParams = %O", JSON.parse(JSON.stringify(entityParams)));
	    var resultData = {};
	    var curProg = 58;

	    csvRowEntities.forEach(parseCsvContent);
	    mergeParsedRecords(callback, validationMode);

	    function parseCsvContent(entityName) {// console.log("parseCsvContent called.");
	    	var entityMetaData = Object.assign({}, entityParams[entityName]);// console.log("entityMetaData = %O", entityMetaData);
			var csvFileId = fileSetObj[entityName].fileId;
			var csvRcrdsAry = fileSetObj[entityName].orgRcrdAryObjs;
	    	curProg = curProg + 5;				//	console.log("parseCsvContent called. curProg = ", curProg);
	    	setProgress(curProg);
	    	resultData[entityName] = runParseChain(csvFileId, csvRcrdsAry, entityName);

	    	if ("subEntities" in entityMetaData) { entityMetaData.subEntities.forEach(parseSubEntity) }

	    	function parseSubEntity(subEntityName) { // console.log("parseSubEntity called.");
		    	curProg = curProg + 7;		//	console.log("parseSubEntity called. curProg = ", curProg);
		    	setProgress(curProg);
	    		resultData[subEntityName] = runParseChain(csvFileId, csvRcrdsAry, subEntityName);
	    	}
	    } /* End parseCsvContent */
	    function mergeParsedRecords(callback, validMode) {//console.log("mergeParsedRecords called. arguments = %O", arguments);
	    	var citSubAry = [resultData.publication, resultData.author];
	    	var intSubAry = [resultData.location];
	    	setProgress(93)
	    	ein.parse.mergeDataSet([], resultData.citation, citSubAry, mergeIntoInteractions)

	    	function mergeIntoInteractions(fSysIdAry, mergedCitRecrds) { // console.log("resultData = %O", resultData);	// var cb = callback || null		//	console.log("resultData = %O", resultData);
	    		var valData = validMode ? resultData : false;
	    		storeTaxaResults();
      	  setProgress(96);
	    		intSubAry.push(mergedCitRecrds);// console.log("callback = %O", callback);
	    		ein.parse.mergeDataSet(fSysIdAry, resultData.interaction, intSubAry, callback, valData)
	    	}
	    } /* End mergeParsedRecords */
	    function storeTaxaResults() {
    		resultData.taxon = {
    			finalRecords: resultData.interaction.taxon.taxaObjs,
    			valRpt: resultData.interaction.taxon.valRpt,
    			name: "taxon"
    		};
	    }
	} /* End parseFileSetRecrds */
	function runParseChain(csvFileId, csvRcrdsAry, curEntity) {
		var result;
		ein.parse.parseChain(csvFileId, csvRcrdsAry, curEntity, function(fSysId, resultObj){ result = JSON.parse(JSON.stringify(resultObj)); });
		return result;
	}


/*--------------Entity Specific Methods--------------------------------------------------- */
	/* --------------------Citation Helpers----------------------------------------------------*/
	// function extractAuthors(recrdsAry, entity, callback) {
	// 	// entityObj.validationResults["extrctdAuths"] = runParseChain(null, recrdsAry, entity);
	// 	callback(recrdsAry, entity)
	// }

	/* --------------------Location Helpers----------------------------------------------------*/
	function getIntIds(recrdsAry, entity, callback) {
		var row = 1;
		var newRcrdsAry = recrdsAry.map(function(recrd){
			recrd.intId = row++;
			return recrd;
		});
		callback(newRcrdsAry, entity);
	}
	function autoFillLocDesc() { // console.log("autoFillLocDesc called. entityObj.curRcrds = %O", entityObj.curRcrds);
		var newRecrd = {};
		entityObj.curRcrds.forEach(function(recrd){// console.log("recrd being processed: %O", arguments);
			newRecrd = recrd;
			if (recrd.locDesc === null) { checkCountryAndHabType(recrd); }
			return newRecrd;
		});

		function checkCountryAndHabType(recrd) {
			if (recrd.country !== null || recrd.habType !== null || recrd.region !== null) { checkAllLocData(recrd); }  //region-unspecified
		}
		function checkAllLocData(recrd) {
			if (noOtherLocData(recrd)) { autofillDesc(recrd); }
		}
		function noOtherLocData(recrd) {
			var foundNoData = ['elev', 'elevRangeMax', 'lat', 'long'].every(function(locField) {
				return recrd[locField] === null;
			});
			return foundNoData;
		}
		function autofillDesc(recrd) {  //  console.log("autofillDesc called. Found no other loc data.");
			if (recrd.country !== null) {
				var countryStr = recrd.country + ' ';
				checkForHabType(recrd, countryStr);
			} else if (recrd.region !== null) {
				var regionStr = recrd.region + ' ';
				checkForHabType(recrd, regionStr)
			} else { checkForHabType(recrd); }
		}
		function checkForHabType(recrd, desc) {	//	console.log("checkForHabType called. arguments = %O", arguments);
			var newLocDesc = desc || '';
			if (recrd.habType !== null) {
				newLocDesc += recrd.habType
			} else { newLocDesc = newLocDesc.trim() + "-Unspecified" }
			recrd.locDesc = newLocDesc.trim();   //console.log("newLocDesc= %s", newLocDesc);
		}
	}/* End autoFillLocDesc */
/* -----Interaction Helpers--------------------------------------------------------------- */
  function fillInIds(recrdsAry, entity, callback) {
		var newRcrdAry = attachTempIds(recrdsAry);
		callback(newRcrdAry, entity);
	}
	/**
	 * Converts tag field for each record to an array and calls {@link ifSecondary } to merge tags with relevant fields.
	 * @return {ary}  		An array of objects with the tag field as an array
	 */
	function mergeSecondaryTags(recrdsObj, entity, callback) {
		var newRecrdObj = {};
		for (var key in recrdsObj) {
			newRecrdObj[key] = checkDirectness(recrdsObj[key]);
	  }
		callback(newRecrdObj, entity);
	}
	function checkDirectness(recrdsAry) {
		var newRecrds = recrdsAry.map(function(recrd) {
			ifSecondary(recrd);
			return recrd;
		});
		return newRecrds;
	}
	/**
	 * If this is a secondary interaction, add that to the tag collection.
	 * @param  {obj}  recrd  Record to check and modify.
	 */
	function ifSecondary(recrd) {
		if (recrd.directness === "Secondary") { recrd.intTag.push("Secondary"); }
		delete recrd.directness;
	}
/* ------------------------Taxon Parse Methods------------------------------------------------ */
	function extractTaxaCols(recrdsObj, entity, callback) {
		var subjFields = JSON.parse(JSON.stringify(entityParams.taxon.subjCols));
		var objFields = JSON.parse(JSON.stringify(entityParams.taxon.objCols));							//console.log("objFields = %O", objFields)
		var taxaFields = subjFields.concat(objFields);						//console.log("taxaFields = %O", taxaFields)
		var taxaRcrds = [];
		var intRefIdx = [];
		entityObj.taxon = {};
		entityObj.taxon.valRpt = {}

		forEachRecrd();		//	console.log("taxaRcrds = %O", taxaRcrds);
		storeTaxaData(taxaRcrds);

		callback(recrdsObj, entity);

		function forEachRecrd() {
			for (var key in recrdsObj) {
				var newRcrd = extrctAndReplaceTaxaFields(recrdsObj[key][0], key);
				if (newRcrd !== false) { recrdsObj[key] = [newRcrd]; }
			}
		}
		function extrctAndReplaceTaxaFields(recrd, key) {
			var taxaRcrd = buildTaxaRcrd(recrd);
			var result = replaceTaxaWithStrng(recrd, key);
			if (result !== false) {taxaRcrds.push(taxaRcrd)};
			return result;
		}

		function buildTaxaRcrd(recrd) {
			var taxonRcrd = {};
			extrctTaxaFields(recrd);

			return taxonRcrd;

			function extrctTaxaFields(recrd) {
				taxaFields.forEach(function(field) { taxonRcrd[field] = recrd[field]; });
			}
		} /* End buildTaxaRcrd */
		function replaceTaxaWithStrng(recrd, key) {
			recrd.subjTaxon = mergeTaxaFields(recrd, subjFields); if (recrd.subjTaxon === undefined) {console.log("subj saved as undefined. recrd = %O", recrd)}
			recrd.objTaxon = mergeTaxaFields(recrd, objFields);  if (recrd.objTaxon === undefined) {console.log("obj saved as undefined. recrd = %O", recrd)}
			var nulls = rprtNullTaxa(recrd.subjTaxon, recrd.objTaxon, recrd, key);
			if (nulls === true) { console.log("rprtNullTaxa."); return false; }
			delteTaxaFields(recrd);

			return recrd;
		}
		function mergeTaxaFields(recrd, fieldAry) {
			var taxaNameStr = "";
			fieldAry.forEach(function(field) { if (recrd[field] !== null) { taxaNameStr += recrd[field]; } });

			return taxaNameStr;
		}
		function delteTaxaFields(recrd) {
			taxaFields.forEach(function(field) { delete recrd[field]; });
		}
		function rprtNullTaxa(subjTaxon, objTaxon, recrd, key) {
			var nulls = false;
			if (objTaxon === "") {
				if (entityObj.taxon.valRpt.rcrdsWithNullReqFields === undefined) { entityObj.taxon.valRpt.rcrdsWithNullReqFields = {}; };
				if (entityObj.taxon.valRpt.rcrdsWithNullReqFields.obj === undefined) {entityObj.taxon.valRpt.rcrdsWithNullReqFields.obj = [];}
				entityObj.taxon.valRpt.rcrdsWithNullReqFields.obj.push(recrd);  console.log("empty string saved for obj in recrdsObj =%O, recrd = %O, key = %s", recrdsObj, recrd, key)
				nulls = true;
			}
			if (subjTaxon === "") {
				if (entityObj.taxon.valRpt.rcrdsWithNullReqFields === undefined) { entityObj.taxon.valRpt.rcrdsWithNullReqFields = {}; };
				if (entityObj.taxon.valRpt.rcrdsWithNullReqFields.subj === undefined) {entityObj.taxon.valRpt.rcrdsWithNullReqFields.subj = [];}
				entityObj.taxon.valRpt.rcrdsWithNullReqFields.subj.push(recrd);
				nulls = true;
			}
			if (nulls === true) { delete recrdsObj[key]; }
			return nulls;
		}
		function storeTaxaData(taxaRcrds) {
			entityObj.taxaRcrdObjsAry = taxaRcrds;
		}
	} /* End extractTaxaCols */
	function buildTaxaObjs(recrdsAry, entity, callback) {
		buildBatTaxaObjs(recrdsAry);  console.log("Path not fully written. Pick up here. Thank you.");
		// buildObjTaxaObjs(recrdsAry);
		// callback(recrdsObj, entity);
	}
	function buildAndMergeTaxonObjs(recrdsObj, entity, callback) { //console.log("buildAndMergeTaxonObjs. arguments = %O, entityObj = %O", arguments, entityObj)
		var taxonRecrdObjsAry = entityObj.taxaRcrdObjsAry;
		attachTempIds(taxonRecrdObjsAry);
		// var curTempId = taxonRecrdObjsAry.length;
		buildTaxaTree(recrdsObj, entity, callback);					//			console.log("buildAndMergeTaxonObjs called. taxaRecrdObjsAry w ids = %O", taxonRecrdObjsAry);
		mergeTaxaIntoInteractions(recrdsObj);

		callback(recrdsObj, entity);
	}

	function buildTaxaTree(recrdsObj, entity, callback) {//console.log("buildTaxaTree. arguments = %O, entityObj = %O", arguments, entityObj)
		var batTaxaRefObjAry, objTaxaRefObjAry;
		var taxonRecrdObjsAry = entityObj.taxaRcrdObjsAry;
		var curTempId = 1;
		attachTempIds(taxonRecrdObjsAry);

		initTopTaxa();
		taxonRecrdObjsAry.forEach(function(recrd) { buildTaxaTree(recrd); });

		entityObj.taxon.batTaxa = batTaxaRefObjAry;
		entityObj.taxon.objTaxa = objTaxaRefObjAry;

		function buildTaxaTree(recrd) {
			var lvlAry = [7, 6, 5, 4, 3, 2, 1];
			buildSubjTaxa(recrd);
			buildObjTaxa(recrd);

		  function buildSubjTaxa(recrd) {				//		console.log("subject recrd = %O", recrd)
				var batFields = JSON.parse(JSON.stringify(entityParams.taxon.subjCols));
				batFields.reverse();			//species, genus, family, order
				extractUnqTaxa(recrd, batTaxaRefObjAry, batFields, "subject");
		  } /* End buildSubjTaxa */
		  function buildObjTaxa(recrd) {   //   console.log("object recrd = %O", recrd)
				var objFields = JSON.parse(JSON.stringify(entityParams.taxon.objCols));
				objFields.reverse();		//all levels from species through kingdom
																																														//	console.log("objFields = %O", objFields);
				extractUnqTaxa(recrd, objTaxaRefObjAry, objFields, "object");
		  } /* End buildObjTaxa */
			function extractUnqTaxa(recrd, taxaObjs, fieldAry, role) { // console.log("recrd inside extractUnqTaxa = %O", recrd)
				var taxaParams = {
					recrd: recrd,
					taxaObjs: taxaObjs,
					fieldAry: fieldAry,
					role: role
				};
				fieldAry.some(function(field, idx) {
					if (recrd[field] !== null) {
						taxaParams.field = field;
						taxaParams.idx = idx;
						foundMostSpecificLevel(taxaParams);
						return true;
					}
				});
			}
			function foundMostSpecificLevel(tP) { //console.log("foundMostSpecificLevel called");  // tP = taxaParams
				var nameConcatMethod = tP.role === "subject" ? concatSubjFieldsIntoKey : concatObjFieldsIntoKey;
				var taxonNameKey = nameConcatMethod(tP, tP.idx);
				isInRefObjOrAdd(taxonNameKey, tP.field, tP.idx, tP);
			}
			function concatSubjFieldsIntoKey(tP, idx) {
				var taxonNameStr = "";
				for (var i = 3; i >= idx; i--) {
					var curField = tP.fieldAry[i];
					taxonNameStr += tP.recrd[curField];
				}
				return taxonNameStr;
			}
			function concatObjFieldsIntoKey(tP, idx) {
				var taxonNameStr = "";
				for (var i = 6; i >= idx; i--) {
					var curField = tP.fieldAry[i];
					if (tP.recrd[curField] !== null) { taxonNameStr += tP.recrd[curField]; }
				}
				return taxonNameStr;
			}
			function isInRefObjOrAdd(taxonNameKey, field, idx, tP) {//		console.log("isInRefObjOrAdd called. taxonNameKey = ", taxonNameKey);
				if (!(taxonNameKey in tP.taxaObjs)) { buildTaxaObj(taxonNameKey, field, idx, tP); }
			}
			function buildTaxaObj(taxonNameKeyStr, field, idx, tP) {
				var level = lvlAry[idx];
				var kingdom = tP.
				role === "subject" ? "Animalia" : tP.recrd.objKingdom;
				var taxonName = (field === "objSpecies" || field === "subjSpecies") ? getSpecies(tP.recrd[field]) : tP.recrd[field];
				tP.taxaObjs[taxonNameKeyStr] = {
					kingdom: kingdom,
					parent: linkParentTaxon(tP, idx, taxonNameKeyStr),
					name: taxonName,
					level: level,				// Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
					tempId:	curTempId++
				};
			}
			function getSpecies(genusSpeciesStr) {			//	console.log("getSpecies called. arguments = %O", arguments)
				var nameAry = genusSpeciesStr.split(" ");
				return nameAry[1];
			}
			function linkParentTaxon(tP, idx, taxonNameKeyStr) { //console.log("linkParentTaxon called. taxonNameKeyStr = %s", taxonNameKeyStr);
			  if (idx === 6) { console.log("parent taxon idx over 7. Error. recrd = %O", tP.recrd); return null; }
				var parentIdx = getParentLevel(tP, idx);
				var parentField = tP.fieldAry[parentIdx];
				var nameConcatMethod = tP.role === "subject" ? concatSubjFieldsIntoKey : concatObjFieldsIntoKey;
				var parentTaxonNameKey = nameConcatMethod(tP, parentIdx);

				isInRefObjOrAdd(parentTaxonNameKey, parentField, parentIdx, tP);

				return tP.taxaObjs[parentTaxonNameKey].tempId;
			}
			function getParentLevel(tP, idx) {		//child level = idx +1
				for (var i = ++idx; i < 7; i++) {
					if (tP.recrd[tP.fieldAry[i]] !== null) { return i; }
				}
			}
		} /* end buildTaxaTre e*/
		function initTopTaxa() {
		  batTaxaRefObjAry = {
				Animalia: {
					kingdom: "Animalia",
					parent: null,
					name: "Animalia",
					level: 1,					// Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
					tempId:	curTempId++
				},
				Chiroptera: {
					kingdom: "Animalia",
					parent: 1,				// 1 = animalia
					name: "Chiroptera",
					level: 4,
					tempId:	curTempId++
				},
		  };
		  objTaxaRefObjAry = {
				Animalia: {									//Repeated here because it will be collapsed in the merge process and animalia waas added as an ancestor antrhopoda very late in the writting of this code and restructuring didn't seen worth the effort and time.
					kingdom: "Animalia",
					parent: null,
					name: "Animalia",
					level: 1,					// Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
					tempId:	1
				},
				Plantae: {
					kingdom: "Plantae",
					parent: null,
					name: "Plantae",
					level: 1,					// Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
					tempId:	curTempId++
				},
				Arthropoda: {
					parent: 1,
					name: "Arthropoda",
					level: 2,
					tempId:	curTempId++
				}
			};
	  } /* End initTopTaxa */
	} /* End buildTaxaTree */

  function mergeTaxaIntoInteractions(recrdsObj) {
  	var batTaxa = entityObj.taxon.batTaxa; //console.log("batTaxa = %O", batTaxa)
  	var objTaxa = entityObj.taxon.objTaxa;	//console.log("objTaxa = %O", objTaxa);

  	for (var key in recrdsObj) { replaceTaxaStrWithObjIds(recrdsObj[key][0]); }

  	mergeTaxaTreeObjsIntoInteractions(recrdsObj);

  	function replaceTaxaStrWithObjIds(recrd) {
  		var subjTaxonStr = recrd.subjTaxon;
  		var objTaxonStr = recrd.objTaxon;
  		recrd.subjTaxon = batTaxa[subjTaxonStr] !== undefined ? batTaxa[subjTaxonStr].tempId : console.log("subjTaxon not found. recrd = %O, subjTaxonStr = '%s'", recrd, subjTaxonStr);
  		recrd.objTaxon = objTaxa[objTaxonStr] !== undefined ? objTaxa[objTaxonStr].tempId : console.log("objTaxon not found. recrd = %O, objTaxonStr = '%s'", recrd, objTaxonStr);
  	}
  } /* End mergeTaxaIntoInteractions */
  function mergeTaxaTreeObjsIntoInteractions(recrdsObj) {
  	var taxaTree = mergeTaxaTreeObjs();// console.log("taxaTree = %O", taxaTree, entityObj);
  	entityObj.taxaObjs = taxaTree;
  	replaceIdWithTaxonObj(recrdsObj);
  }
	function mergeTaxaTreeObjs() {
  	var taxaAry = [entityObj.taxon.batTaxa, entityObj.taxon.objTaxa];
  	var taxaTree = entityObj.taxon.taxaTree = {};
  	forEachTaxaSet();
  	forAllTaxaParents();

  	return taxaTree;

  	function forEachTaxaSet(argument) {
	  	taxaAry.forEach(function(taxaRecrds) {
	  		for (var key in taxaRecrds) {
	  			var newKey = taxaRecrds[key].tempId;
	  			taxaTree[newKey] = taxaRecrds[key];
	  		}
	  	});
  	}
  	function forAllTaxaParents() {
  		for (var key in taxaTree) {
  			taxaTree[key].parent = (taxaTree[key].parent === null) ? null : taxaTree[taxaTree[key].parent];
  		}
  	}
	} /* End mergeTaxaTreeObjs */
	function replaceIdWithTaxonObj(recrdsObj) {
		var taxaTree = entityObj.taxon.taxaTree;
		for (var key in recrdsObj) {
			recrdsObj[key][0].subjTaxon = taxaTree[recrdsObj[key][0].subjTaxon];
			recrdsObj[key][0].objTaxon = taxaTree[recrdsObj[key][0].objTaxon];
		}
	}
	function checkCitId(recrdsObj, entity, callback) { //console.log("checkCitId called. arguments = %O", arguments);
		var nullCitRcrds = [];
		for (var key in recrdsObj) {
			if (recrdsObj[key][0].citId === null) { nullCitRcrds.push(recrdsObj[key][0]); }
		}
		nullCitRcrds.forEach(function(rcrd){ delete recrdsObj[rcrd.tempId] });
		// if (entityObj.validationResults.rcrdsWithNullReqFields !== undefined) {  }
		if (nullCitRcrds.length > 0) {
			entityObj.validationResults.rcrdsWithNullReqFields = {
				recordCnt: nullCitRcrds.length,
				recrds: nullCitRcrds,
				unqKey: ["citId"]
			};
		}
		callback(recrdsObj, entity)
	}
/*--------------General Helper Methods---------------------------------------------------- */
	/**
	 * Attach temporary Ids incrementally to record objects so extracted data can be linked to the original record.
	 * @param  {array} recrdsAry Colletion of record objects.
	 * @return {array} A new collection of record objects with a tempId property
	 */
	function attachTempIds(recrdsAry) {  //	console.log("attachTempIds");
		var id = 2;
		var newRecrds = recrdsAry.map(function(recrd){
			recrd.tempId = id++;
			return recrd;
		});
		return newRecrds;
	}
	/**
	 * Builds a new recordObj with a specified field in each record split into an array
	 *
	 * @param  {obj} recrdsObj An object with each record sorted into arrays under keys of their unique field values.
	 * @param  {str}  entity    The entity currently being parsed
	 * @callback     Recieves an array of record objects with any exact duplicates removed.
	 */
	function splitFieldIntoAry(recrdsObj, entity, callback) {
		var nullRefAry = [];
		var splitField = entityObj.splitField;
		var newRecrdObj = {};
		forEachRecAry();  //console.log("newRecrdObj after forEachRecAry= %O", newRecrdObj);

		if (nullRefAry.length > 0) { addNullReqRefs(); }

		callback(newRecrdObj, entity);
		/**
		 * Loops through each top key in the record object and calls {@link splitFields }
		 */
		function forEachRecAry() {
			for (var key in recrdsObj) {
				newRecrdObj[key] = splitFields(key);
			}
		}
		/**
		 * Splits a specified field of each record into an array on commas
		 *
		 * @param  {str} key  Top key for array of records sharing unqKey field
		 * @return {ary}      New record obj array
		 */
		function splitFields(key) {			//	console.log("splitFields called. recrdsObj[key] = %O", recrdsObj[key])
			var newRecrds = recrdsObj[key].map(function(recrd) {
				recrd[splitField] = recrd[splitField] === null ? procNullField(recrd, key) : splitAndTrimField(recrd);
				return recrd;
			});
			return newRecrds;
		}
		function splitAndTrimField(recrd) {  //console.log("splitAndTrimField called. recrd = %O", recrd);
			var collectionAry = recrd[splitField].split(",");
			var trimmedAry = collectionAry.map(function(valueStr){
				return valueStr.trim();
			});
			return trimmedAry;
		}
		function procNullField(recrd, key) {
			if (entityObj.reqRef !== undefined) {
				nullRefAry.push(recrd);
				return null;
			} else {
				return [];
			}
		}
		function addNullReqRefs() { //console.log("addNullReqRefs. nullRefAry = %O", nullRefAry);
			nullRefAry.forEach(function(rcrd) { delete newRecrdObj[rcrd.citId] });
			entityObj.validationResults.rcrdsWithNullReqFields = {
				recordCnt: nullRefAry.length,
				recrds: nullRefAry,
				unqKey: entityObj.reqRef
			}
		}
	} /* End splitFieldIntoAry */
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
		return countRecrdsInObj(obj1) - countRecrdsInObj(obj2);
	}
	/**
	 * Checks if an object is empty
	 * @param  {object}  obj
	 * @return {Boolean}     Returns false if key is found.
	 */
	function isEmpty(obj) {
  	for (var x in obj) { return false; }
  	return true;
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
}());