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
            cols:   ['citId', 'citShortDesc', 'fullText', 'author', 'title', 'pubTitle', 'year', 'vol', 'issue', 'pgs'],
            parseMethods: [extractCols, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts, splitFieldIntoAry],
            validationResults: {},
            extrctdAuths: {}
        },
        interaction: {          // Taxa are handled with methods: extractTaxaCols, buildTaxonObjs, & mergeTaxonObjs
            name: 'interaction',
            childEntites: ['location', 'citation'],
            subEntities: ['location'],
            unqKey: ['id', 'tempId'],
            splitField: 'intTag',
            cols: ['directness', 'citId', 'locDesc', 'intType', 'intTag', 'subjOrder', 'subjFam', 'subjGenus', 'subjSpecies', 'objKingdom', 'objPhylum', 'objClass', 'objOrder', 'objFam', 'objGenus', 'objSpecies'],
            parseMethods: [autoFillLocDesc, fillInIds, extractCols, restructureIntoRcrdsObj, extractTaxaCols, buildTaxonObjs ], //splitFieldIntoAry, mergeSecondaryTags, checkCitId, mergeTaxonObjs],
            validationResults: {},
            taxaRcrdObjsAry: {}
        },
        location: {
            name: 'location',
            unqKey: ['locDesc'],
            cols:   ['locDesc', 'elev', 'elevRangeMax', 'lat', 'long', 'region', 'country', 'habType'],
            parseMethods: [extractCols, deDupIdenticalRcrds, autoFillLocDesc, restructureIntoRcrdsObj, autoFillAndCollapseRecords, hasConflicts],
            validationResults: {}
        },
        publication: {
            name: 'publication',
            unqKey: ['pubTitle'],
            cols:   ['pubTitle','pubType','publisher'],
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
        entityObj.orgRcrdAryObjs = recrdsAry;               //  console.log("entity = %s, entityObj = %O", entity, entityObj);
        entityObj.curRcrds = recrdsAry;
        executeParseChain(entity);

        cleanUpReturnResults(entityObj.curRcrds);

        if (validMode) { validationObj[entity] = entityObj; }

        callback(fSysId, entityObj.valResults); //  console.log("recurParseMethods complete. metaData = %O", entityObj.validationResults);
    }
    function copyParseChain(parseMethodChain) {
        return parseMethodChain.map(function(method){ return method });
    }
    function executeParseChain(entity) {
        var parseMethods = copyParseChain(entityParams[entity].parseMethods); // console.log("parseChain = %O", parseChain);
        parseMethods.forEach(function(curMethod){
            curMethod();                                                        //recrds, entity, recurParseMethods
        });
    }
    function cleanUpReturnResults(recrdsObj) {   //console.log("entityObj = %O", entityObj)
        entityObj.valResults = {
            finalRecords: recrdsObj,
            name: entityObj.name,
            orgRcrdAry: entityObj.orgRcrdAryObjs,
            valRpt : entityObj.validationResults
        };
        if ("taxaObjs" in entityObj) { // console.log("taxa data being stored = %O", entityObj.taxon.valRpt)
            entityObj.valResults.taxon = {
                taxaObjs: entityObj.taxaObjs,
                valRpt: entityObj.taxon.valRpt          //isEmpty(entityObj.taxon.valRpt) ? null :
            }; // console.log("entityObj.valResults = %O", entityObj.valResults);
        }
    }
    /**
     * Takes an array of record objects and extracts the specified columns/keys and values.
     */
    function extractCols() {
        var recrdsAry = entityObj.orgRcrdAryObjs;
        var entityType = entityObj.name;
        var columns = entityObj.cols;                                                                                               //  console.log("extractCols called. recrdsAry = %O", recrdsAry);

      entityObj.curRcrds =  recrdsAry.map(function(recrd){ return extract(columns, recrd); });  //  console.log("Extracted object = %O", extrctdObjs);

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
     * @param  {array} recrdsAry    An array of record objects
     * @return {array}                      Returns an array of unique, and non-null, record objects.
     */
    function findUnqRecords(recrdsAry) {                                                                                                                                    //  console.log("deDupIdenticalRcrds called. Original Records = %O", recrdsAry);
      var isDup = false, dupCount = 0, processed = [], dupIntIdRefs = {};

        removeDups(recrdsAry);        // console.log("%s duplicates", dupCount);
        var unqRecrds = removeNulls(processed);
        return unqRecrds;
    /*----------------Helper Functions for deDupIdenticalRcrds------------------------------------------------------------ */
        /**
         * Each record is checked against every previously processed ({@link checkAgainstProcessed})
         * If unique, the record is added to the processed array; otherwise, it increments the duplicate count.
         *
         * @param  {array} recrdsAry    An array of record objects
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
         * @return {bool}            True if duplicate is found
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
    function isDuplicate(recrdOne, recrdTwo) {                                                                                                                      //  console.log("recrds... 1 =%O, 2 = %O", recrdOne, recrdTwo);
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
            for (var key in recrdOne) {                                                         // Loop through each key/value in the matching records
                // if (key === "intId") { continue }
                if (recrdOne[key] !== recrdTwo[key]) {                              // If a value is unique this is not an exact duplicate
                    isDup = false;          //      console.log("Records not equal. recrdOne = %O, recrdTwo = %O", recrdOne, recrdTwo);
                    break;
                }
            }
        }
    } /* End isDuplicate */
    /**
     * Seperates the array of records into an object of arrays grouped under their unique key field.
     */
    function restructureIntoRcrdsObj() {            //  console.log("restructureIntoRcrdsObj entityObj= %O", entityObj);
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
       * @param  {array} recrdsAry  An array of record objects
         */
        function sortRecords(recrdsAry) {
            recrdsAry.forEach(function(recrd){
                sortOnUnqField(recrd, unqField);
            });                         //  console.log("restructureIntoRcrdsObj = %O", recrdObjsByUnqKey);        console.log("rcrdsWithNullUnqField = %O", rcrdsWithNullUnqField);
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
     * Records that share unqKey values, and no otherwise conflicting data, are bi-directionally filled and any resulting duplicate records removed.
     */
    function autoFillAndCollapseRecords() {
        var collapsedCnt, filledRecsCnt;
        var processedRcrds = {};
        var recrdsObj = entityObj.curRcrds;
        var recordsRecieved = countRecrdsInObj(recrdsObj);                                              //  console.log("autoFillAndCollapseRecords recds recieved ", recordsRecieved);

        fillCandidatesIfAble(isolateCandidatesToFill(recrdsObj));
    addAutoFillAndCollapseMetaData();

    entityObj.curRcrds = processedRcrds;
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
         * If no conflicts, the records are mutually filled and resulting duplicates removed.        *
         * @param  {object} candidates  Object with arrays of records with fill potential.
         * @return {object}                         Record object with any records, that could be, filled and collapsed.
         */
        function fillCandidatesIfAble(candidates) {                 //  console.log("fillCandidatesIfAble candidates = %O", candidates);
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
    function hasConflicts() {                   //  console.log("hasConflicts returned recrdsObj = %O",recrdsObj);
        var processed, conflictedAry;
        var conflicted = false;
        var rcrdsRecieved = countRecrdsInObj(entityObj.curRcrds);
        var conflictedRecrds = checkEachRcrdForConflicts(entityObj.curRcrds);               //console.log("%s conflicts = %O", entity, conflictedRecrds);
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
            processed.some(function(procesd){                                                           // Loop through each record already processed
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
    }       /* End of hasConflicts */
    /**
     * Checks if unique fields are identical and, if so, calls {@link checkForConflicts}
     *
     * @param  {object}  recrd   Record currently being checked for conflicts
     * @param  {object}  procesd Previously processed record being checked against
     * @return {Boolean}         Returns true if conflicts have been found.
     */
    function isConflicted(recrd, procesd, unqField) {
        var conflicted = false;
        if (recrd[unqField] === procesd[unqField]) {            // If the unique key values are identical
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
        for (var key in recrd) {                                                                                        // Loop through each key/value in the matching records
            if (recrd[key] !== null && procesd[key] !== null) {         //  console.log("checkForConflicts:  recrd[key]=%O procesd[key]=%O ",recrd[key] ,procesd[key]);
                if (recrd[key] !== procesd[key]) {
                    conflicted = true;                                                                                          // This is a conflicted record.
                    break;
                }
            }
        }
        return conflicted;
    }
/*--------------Entity Specific Methods--------------------------------------------------- */
    /* -------------------------------------Location Helpers------------------------------------*/
    function autoFillLocDesc() { // console.log("autoFillLocDesc called. entityObj.curRcrds = %O", entityObj.curRcrds);
        var newRecrd = {};
        var filledRcrds = entityObj.curRcrds.map(function(recrd){// console.log("recrd being processed: %O", arguments);
            newRecrd = recrd;
            if (recrd.locDesc === null) { checkCountryAndHabType(recrd); }
            return newRecrd;
        });
        entityObj.curRcrds = filledRcrds;

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
        function checkForHabType(recrd, desc) { //  console.log("checkForHabType called. arguments = %O", arguments);
            var newLocDesc = desc || '';
            if (recrd.habType !== null) {
                newLocDesc += recrd.habType
            } else { newLocDesc = newLocDesc.trim() + "-Unspecified" }
            recrd.locDesc = newLocDesc.trim();   //console.log("newLocDesc= %s", newLocDesc);
        }
    }/* End autoFillLocDesc */
/* -----Interaction Helpers--------------------------------------------------------------- */

  function fillInIds() {
        entityObj.curRcrds = attachTempIds(entityObj.curRcrds);
    }
    /**
     * Converts tag field for each record to an array and calls {@link ifSecondary } to merge tags with relevant fields.
     */
    function mergeSecondaryTags() {
        var newRecrdObj = {};
        var recrdsObj = entityObj.curRcrds;
        for (var key in recrdsObj) {
            newRecrdObj[key] = checkDirectness(recrdsObj[key]);
      }
        entityObj.curRcrds = newRecrdObj;
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
/**
 * Extracts taxa data from each record, replaces these with subject and object id references for merging
 * with the completed subject and object taxa records.
 */
    function extractTaxaCols() {
        var subjFields = JSON.parse(JSON.stringify(entityParams.taxon.subjCols));
        var objFields = JSON.parse(JSON.stringify(entityParams.taxon.objCols));                         //console.log("objFields = %O", objFields)
        var taxaFields = subjFields.concat(objFields);                      //console.log("taxaFields = %O", taxaFields)
        var recrdsObj = entityObj.curRcrds;
        var taxaRcrds = [];
        var intRefIdx = [];
        entityObj.taxon = {};
        entityObj.taxon.valRpt = {};

        for (var key in recrdsObj) {
            var newRcrd = extrctAndReplaceTaxaFields(recrdsObj[key][0], key);
            recrdsObj[key] = [newRcrd];
        }       console.log("taxaRcrds = %O", taxaRcrds);

        storeTaxaData(taxaRcrds);

        function extrctAndReplaceTaxaFields(recrd, key) {
            var taxaRcrd = buildTaxaRcrd(recrd);
            var result = replaceTaxaWithRef(recrd, key);
            if (result !== false) {taxaRcrds[recrd.tempId] = taxaRcrd};
            return result;
        }
        function buildTaxaRcrd(recrd) {
            var taxonRcrd = { tempId: recrd.tempId };
            extrctTaxaFields(recrd);

            return taxonRcrd;

            function extrctTaxaFields(recrd) {
                taxaFields.forEach(function(field) { taxonRcrd[field] = recrd[field]; });
            }
        } /* End buildTaxaRcrd */
        function replaceTaxaWithRef(recrd, key) {
            recrd.subjTaxon = recrd.tempId; 
            recrd.objTaxon = recrd.tempId;  
            delteTaxaFields(recrd);

            return recrd;
        }
        function delteTaxaFields(recrd) {
            taxaFields.forEach(function(field) { delete recrd[field]; });
        }
        function storeTaxaData(taxaRcrds) {
            entityObj.taxaRcrdObjsAry = taxaRcrds;
        }
    } /* End extractTaxaCols */
    /**
     * Builds an object for each unique taxon extracted from the interaction records. They are built aware
     * of each other and collapse where possibile. Any conflicts in taxonymns at different levels in the 
     * taxa tree are quarantined and reported.
     */
    function buildTaxonObjs() {
        var batTaxaRefObj, objTaxaRefObj;   // Taxon objects for each role, keyed by taxonName
        var taxaNameMap = {};               // Used as a quick link between id and the taxonName
        var conflictedTaxaIds = {};         // Taxa records with conflicted field data
        var nullKingdoms = {};              // Taxa records with null Kingdoms, i.e. taxon with no parent
        var mergeRefObj = {};               // Reference object for merging back into interaction records
        var taxonRecrdObjsAry = entityObj.taxaRcrdObjsAry;      // Extracted taxaObjs, one per record. 
        var curTempId = 1;
        var batFields = JSON.parse(JSON.stringify(entityParams.taxon.subjCols));
        var objFields = JSON.parse(JSON.stringify(entityParams.taxon.objCols));
        batFields.reverse();        //species, genus, family, order
        objFields.reverse();        //all levels, species through kingdom                                                                                                                                   //  console.log("objFields = %O", objFields);

        initTopTaxa();                                                                      
        taxonRecrdObjsAry.forEach(function(recrd) { buildTaxaTree(recrd); });

        if (!isEmpty(nullKingdoms)) { rprtNullKingdoms() }                      console.log("mergeRefObj = %O, batTaxaRefObj = %O, objTaxaRefObj = %O", mergeRefObj, batTaxaRefObj, objTaxaRefObj)
        if (!isEmpty(conflictedTaxaObj)) { rprtConflictedTaxon() }              console.log("conflictedTaxaObj = %O", conflictedTaxaObj);  
                                                                                console.log("taxonRecrdObjsAry = %O", taxonRecrdObjsAry)
        entityObj.taxon.batTaxa = batTaxaRefObj;                                console.log("taxaNameMap = %O", taxaNameMap); 
        entityObj.taxon.objTaxa = objTaxaRefObj;

        function buildTaxaTree(recrd) {
            var lvlAry = [7, 6, 5, 4, 3, 2, 1]; // Used to reference back to the original hierarchy structure of the levels (i.e. Lvl Kingdom = 1)
            var errors = false;                 // Used as an escape flag if errors are found that invalidate the record.

            buildSubjTaxa(recrd);
            buildObjTaxa(recrd); 

            function buildSubjTaxa(recrd) {                                     //  console.log("subject recrd = %O", recrd)
                extractUnqTaxa(recrd, batTaxaRefObj, batFields, "subject");
            }
            function buildObjTaxa(recrd) {                                      //   console.log("object recrd = %O", recrd)
                extractUnqTaxa(recrd, objTaxaRefObj, objFields, "object");
            }
            function extractUnqTaxa(recrd, taxaObjs, fieldAry, role) {          // console.log("recrd inside extractUnqTaxa = %O", recrd)
                var taxaParams = { // Referenced as tP throughout.
                    recrd: recrd,
                    taxaObjs: taxaObjs,
                    fieldAry: fieldAry,
                    role: role,
                    genusParent: false  // If species is present, the first word of the species taxonym is added here for later comparison. 
                };
                // Loop through the taxa fields from species up. When a value is found, begin to build the taxon object.
                fieldAry.some(function(field, idx) {
                    if (recrd[field] !== null) {
                        taxaParams.field = field;
                        taxaParams.idx = idx;
                        foundMostSpecificLevel(taxaParams);
                        return true;
                    }
                });
            }
            function foundMostSpecificLevel(tP) {                               // console.log("foundMostSpecificLevel called. tP = %O", tP);  // tP = taxaParams
                var taxonName = (tP.field === "objSpecies" || tP.field === "subjSpecies") ? getSpecies(tP.recrd[tP.field], tP) : tP.recrd[tP.field];
                addTaxonData(taxonName, tP.field, tP.idx, tP);
            }
            // The first word of the species taxonym is added to tP for later comparison. 
            function getSpecies(genusSpeciesStr, tP) {  
                var nameAry = genusSpeciesStr.split(" ");
                tP.genusParent = nameAry[0];                                    // console.log("getSpecies called. tP.genusParent = ", tP.genusParent)
                return nameAry[1];
            }
            /**
             * If taxonName already exists as a taxaObj, check for new data. Otherwise, build the taxon obj.
             * Add taxon's new taxaObj id to the reference object for later merging with interactions.
             */
            function addTaxonData(taxonName, field, idx, tP) {  console.log("addTaxonData called. taxonName = ", taxonName);
                if (taxonName in tP.taxaObjs) { fillInAnyNewData(taxonName, field, idx, tP);
                } else {
                    buildTaxonObj(taxonName, field, idx, tP); 
                }
                addMergeObjRef(taxonName, tP);
                
                function addMergeObjRef(taxonName, tP) {
                    if (mergeRefObj[tP.recrd.tempId] === undefined) { mergeRefObj[tP.recrd.tempId] = {}; }
                    mergeRefObj[tP.recrd.tempId][tP.role] = errors ? false : tP.taxaObjs[taxonName].tempId;         
                }
            } /* End addTaxonData */
        /*-------------- Taxon Data Fill and Conflict Methods ----------------*/
            /**
             * First checks if this is already the highest level for this role in the record. (subject = Order; object = Kingdom)
             * Gets the existing parent for this taxonName and gets the parent present in this record;
             * if they are different @checkIfTreesMerge is called to determine whether this is due to missing or conflicting data.
             */
            function fillInAnyNewData(taxonName, field, idx, tP) {              console.log("fillInAnyNewData called. rcrd = %O", tP.recrd);
                if ( tP.fieldAry.indexOf(field) === tP.fieldAry.length - 1 ) { return; }  // console.log("last field in set");
                if (tP.fieldAry[0] === field) { checkGenusField() }
                var existingParentId = tP.taxaObjs[taxonName].parent;
                var newParentId = linkparentTaxonId(idx, tP);

                if ( newParentId !== existingParentId ) { 
                    checkIfTreesMerge(taxonName, newParentId, existingParentId, tP); 
                }
                // If Genus is null, set genus as the first word of the species string.
                function checkGenusField() {
                    if (tP.recrd[tP.fieldAry[1]] === null) { 
                        tP.recrd[tP.fieldAry[1]] = tP.genusParent; }
                }
            /**
             * If the taxon has a more specific direct parent in this record than in one previously processed, 
             * check and see if the parent tree merges at a later point @doTreesMerge. If they do, 
             * add this new taxon as the most direct parent. If the records have conflicting taxonNames 
             * at the same level they are checked for validity and conflicts @checkForSharedTaxonymOrConflicts.
             */
            function checkIfTreesMerge(taxonName, newParentId, existingParentId, tP) { console.log("checkIfTreesMerge called. taxaNameMap = %O, newParentId = %s", taxaNameMap, newParentId);
                // Grab the existing taxaObjs' parents' levels.
                var newLvl = tP.taxaObjs[taxaNameMap[newParentId]].level;  
                var oldLvl = tP.taxaObjs[taxaNameMap[tP.taxaObjs[taxonName].parent]].level; // console.log("newLvl = %s, oldLvl = ", newLvl, oldLvl);
                if (newLvl !== oldLvl) { //console.log("newParent more specific");
                    doTreesMerge(newLvl, oldLvl, newParentId, existingParentId, tP);
                } else { checkForSharedTaxonymOrConflicts(newLvl, oldLvl, newParentId, existingParentId, tP); }
            } /* End checkIfTreesMerge */
            /**
             * If the taxon has a more specific direct parent in this record than in one previously processed, 
             * check and see if the parent tree merges at a later point @doTreesMerge. If they do, 
             * add this new taxon as the most direct parent.
             * NOTE: @confirmDirectRelationships yet to be written; will probably wait for case to emerge. 
             */
            function doTreesMerge(newLvl, oldLvl, newParentId, existingParentId, tP) {
                if (newLvl > oldLvl) {   // more specific taxon
                    if (treesMergeAtHigherLevel(tP.taxaObjs[taxaNameMap[newParentId]], existingParentId, tP)) {
                        tP.recrd.parent = newParentId;  console.log("trees merge");
                    }
                } else { confirmDirectRelationship(tP.taxaObjs[taxaNameMap[newParentId]], newParentId, ); }

                function confirmDirectRelationships(existingTaxonObj, newParentId) {  console.log("trees don't merge. newParentId =%s, existing =%s, rcrd = %O, oldParent = %O", newParentId, existingParentId, tP.recrd, tP.taxaObjs[taxaNameMap[existingParentId].name]); 
                    //  newLvl < oldLvl  // Not sure what to check for here yet... So much else to do... I'll be back. *wait for me*
                }
            } /* End doTreesMerge */
            /**
             * If @taxonObjWasCreatedWithSharedTaxonym return false, check if @speciesHasCorrectGenusParent and,
             * if so, @addUniqueTaxaWithSharedTaxonym. If the species and genus names conflict @hasParentConflicts 
             * is called with the existing taxonObj unaffected. If there is another level with conflicting data 
             * between the two records, both records are quarantined in @hasParentConflicts.
             */
            function checkForSharedTaxonymOrConflicts(newLvl, oldLvl, newParentId, existingParentId, tP) {
                if ( taxonObjWasCreatedWithSharedTaxonym(taxonName, newParentId, tP) ) { return; }
                if ( speciesHasCorrectGenusParent(existingParentId, tP, newLvl) ) { addUniqueTaxaWithSharedTaxonym(taxonName, tP);                        
                } else if ( speciesHasCorrectGenusParent(existingParentId, tP, newLvl) === false ) { 
                    hasParentConflicts(taxonName, null, newLvl, tP);      console.log("speciesHasInCorrectGenusParent")
                } else { hasParentConflicts(taxonName, tP.taxaObjs[taxonName], newLvl, tP); }
            }
            /**
             *  Checks if current taxon has been previously created under a taxonName with an appended 
             *  number by checking the parent of any matching taxonName found. If the parent matches, 
             *  this taxon has already been created with the proper parent and there is nothing more to do.
             */
            function taxonObjWasCreatedWithSharedTaxonym (taxonName, newParentId, tP) { console.log("taxonObjWasCreatedWithSharedTaxonym called for ", taxonName)
                var taxonym1 = taxonName + '-1';
                return hasBeenCreated(taxonym1); 
                /** Returns true if a taxon record is found with passed taxonym and the parents match. */
                function hasBeenCreated(taxonym, cnt) {
                    if (taxonym in tP.taxaObjs) {
                        if ( tP.taxaObjs[taxonym].parent === newParentId ) { return true; 
                        } else {
                            var nextTaxonym = taxonym + '-' + ++cnt;
                            return hasBeenCreated(nextTaxonym, cnt); }
                    } else { return false; }
                }
            } /* End taxonObjWasCreatedWithSharedTaxonym */
            /**
             * If the conflicted level is Genus, check whether the genus portion of the species name string 
             * from this record is the same as it's genus field. 
             * If so, this taxonName is a unique taxon that shares a species name with another taxon. 
             */
            function speciesHasCorrectGenusParent(existingParentId, tP, lvl) {   console.log("speciesHasCorrectGenusParent called.");
                if (lvl === 6) {
                    var parentName = tP.recrd[tP.fieldAry[lvlAry[lvl]]];  console.log("parentName = %s, genusParent = %s", parentName, tP.genusParent)
                    return tP.genusParent === parentName;                   
                } else { return null; }
            }
            /**
             * This taxonName is a unique taxon that shares a species name with another taxon.
             * @appendNumToTaxonym and @addTaxonData. 
             */
            function addUniqueTaxaWithSharedTaxonym(taxonName, tP) {  
                var taxonym = appendNumToTaxonym(taxonName, tP);        //console.log("addUniqueTaxaWithSharedTaxonym new taxonym = ", taxonym)
                addTaxonData(taxonym, tP.field, tP.idx, tP);
            }
            /** Appends a number incrementally until a unique taxonym is found. */
            function appendNumToTaxonym(taxonName, tP) {
                var count = 1;
                var taxonym1 = taxonName + '-1';
                return nextInTaxaObj(taxonName, taxonym1, count, tP);
                
                function nextInTaxaObj(taxonName, taxonym, cnt, tP) {
                    if (taxonym in tP.taxaObjs) {
                        var nextTaxonym = taxonName + '-' + ++cnt;  
                        return nextInTaxaObj(taxonName, nextTaxonym, cnt, tP)
                    } else { return taxonym; }
                }
            } /* End appendNumToTaxonym */
            /** Adds conflcited records to the conflictedTaxaObj.      */
            function hasParentConflicts(taxonName, existingTaxonObj, conflictingLvl, tP) {  console.log("hasParentConflicts called. arguments = %O", arguments);
                initConflictedTaxaObj();  
                if ( existingTaxonObj === null )    { addConflictedFields() 
                } else { addConflictedPrnts() }     
                /** Init the various properties of the conflictedTaxaObj as they're needed. */
                function initConflictedTaxaObj() { if (tP.role === 'object') { console.log("objectRole added.") }
                    if ( conflictedTaxaObj[tP.role] === undefined ) { conflictedTaxaObj[tP.role] = {}; }
                    if ( conflictedTaxaObj[tP.role][taxonName] === undefined ) { conflictedTaxaObj[tP.role][[taxonName]] = {}; }
                    if ( existingTaxonObj === null ) { initConflictedFields() 
                    } else { // New property by level name
                        if ( conflictedTaxaObj[tP.role][taxonName][tP.fieldAry[lvlAry[conflictingLvl]]] === undefined ) { 
                            conflictedTaxaObj[tP.role][taxonName][tP.fieldAry[lvlAry[conflictingLvl]]] = []; }
                    }
                    function initConflictedFields() {
                        if ( conflictedTaxaObj[tP.role][taxonName].rcrdsWithConflictedFields === undefined ) { 
                            conflictedTaxaObj[tP.role][taxonName].rcrdsWithConflictedFields = []; }
                    }
                } /* End initConflictedTaxaObj */
                /** Pushes the taxonObj IDs onto the conflictedTaxaObj. */
                function addConflictedFields() {
                    conflictedTaxaObj[tP.role][taxonName].rcrdsWithConflictedFields.push(tP.recrd.tempId); 
                }
                /** Pushes both taxonObj IDs onto the conflictedTaxaObj. */
                function addConflictedPrnts() {                                 // console.log("conflicting parents pushed = old.%O- new.%O ", taxonRecrdObjsAry[existingTaxonObj.rcrdId], taxonRecrdObjsAry[tP.recrd.tempId]);
                    var conflictedAry =[existingTaxonObj.rcrdId, tP.recrd.tempId];
                    conflictedTaxaObj[tP.role][taxonName][tP.fieldAry[lvlAry[conflictingLvl]]].push(conflictedAry); 
                }
            } /* End hasParentConflicts */
            /** 
             * Recurses through all parents of the 'newParentTaxonRcrd' and returns
             * true if the tree merges back into the existing parent taxon. 
             */
            function treesMergeAtHigherLevel(newParentTaxonRcrd, existingParentId, tP) {
                if (newParentTaxonRcrd.parent === null) { return false; }
                if (newParentTaxonRcrd.parent === existingParentId) {
                    return true;
                } else {
                    return treesMergeAtHigherLevel(tP.taxaObjs[taxaNameMap[newParentTaxonRcrd.parent]], existingParentId, tP)
                }
            }
        /*-------------- Taxon Object Methods --------------------------------*/
            function buildTaxonObj(taxonName, field, idx, tP) { // console.log("buildTaxonObj called. arguemnts = %O", arguments);
                var level = lvlAry[idx];
                var kingdom = tP.role === "subject" ? "Animalia" : tP.recrd.objKingdom;
                if (tP.fieldAry[0] === field) { checkGenus() }
                if (errors) { return; }

                var parentTaxonId = linkparentTaxonId(idx, tP);
                if (parentTaxonId === null) { nullParentError(tP);
                } else {
                    tP.taxaObjs[taxonName] = {
                        kingdom: kingdom,
                        parent: parentTaxonId,
                        name: taxonName,
                        level: level,               // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
                        tempId: curTempId++,
                        rcrdId: tP.recrd.tempId
                    };
                    taxaNameMap[tP.taxaObjs[taxonName].tempId] = taxonName; 
                }
                function checkGenus() { console.log("checking genus. genus field %s = ", tP.fieldAry[1], tP.recrd[tP.fieldAry[1]]);
                    if (tP.recrd[tP.fieldAry[1]] === null) { tP.fieldAry[1] = tP.genusParent; console.log("filled in genus")
                    } else if (!validGenus()) { conflictedGenusError(); }
                }
                function validGenus() { console.log("isValidGenus = ", tP.recrd[tP.fieldAry[1]] === tP.genusParent);
                    return tP.recrd[tP.fieldAry[1]] === tP.genusParent;
                }
                function conflictedGenusError() {
                    hasParentConflicts(taxonName, null, 6, tP); 
                    errors = true;
                }
            } /* End buildTaxonObj */
            function linkparentTaxonId(idx, tP) {// console.log("linkparentTaxonId called. arguments = %O", arguments);
                if (idx === 6) { console.log("Error. Parent taxon idx too high. recrd = %O", tP.recrd); return null; }
                var parentIdx = getParentLevel(tP, idx);
                if (parentIdx === false) { return null; }
                var parentField = tP.fieldAry[parentIdx];  //console.log("parentField = ", parentField)
                var parentName = tP.recrd[parentField];  //console.log("parentName = ", parentName)
                
                addTaxonData(parentName, parentField, parentIdx, tP);

                return tP.taxaObjs[parentName].tempId;
            }
            function getParentLevel(tP, idx) {  //  console.log("getParentLevel called. idx = ", idx)
                for (var i = ++idx; i <= 7; i++) {                      // if i ever gets to 7 then there is no value in kingdom(6)
                    if (i === 7) { console.log("i=7; kingdom===null; no parent found at top of tree."); return false; }
                    if (tP.recrd[tP.fieldAry[i]] !== null) { return i; }
                }
            }
            function nullParentError(tP) { // console.log("nullParentError tP = %O", tP)
                errors = true;
                if (nullKingdoms[tP.role] === undefined) { nullKingdoms[tP.role] = [] };
                nullKingdoms[tP.role].push(recrd);
                delete recrdsObj[tP.recrd.tempId];
            }
         } /* End buildTaxaTree */
        function rprtNullKingdoms() {
            if (entityObj.taxon.valRpt.rcrdsWithNullReqFields === undefined) { entityObj.taxon.valRpt.rcrdsWithNullReqFields = {}; };
            entityObj.taxon.valRpt.rcrdsWithNullReqFields.kingdom = nullKingdoms;
        }
        function rprtConflictedTaxon() {
            for (var role in conflictedTaxaObj) {
                for (var taxonName in conflictedTaxaObj[role]) {  //console.log("")
                    for (var level in conflictedTaxaObj[role][taxonName]) {  //console.log("")
                        conflictedTaxaObj[role][taxonName][level] = 
                            conflictedTaxaObj[role][taxonName][level].filter(onlyUnique);
                        conflictedTaxaObj[role][taxonName][level] = 
                            replaceIdsWithRcrds(conflictedTaxaObj[role][taxonName][level], role);
                    }
                }
            }
            entityObj.taxon.valRpt.shareUnqKeyWithConflictedData = conflictedTaxaObj; // console.log(" conflicted taxa report obj = %O", entityObj.taxon.valRpt.shareUnqKeyWithConflictedData);
            
            function replaceIdsWithRcrds(taxaIdAry, role) {
                var taxaObjs = role === "subject" ? batTaxaRefObj : objTaxaRefObj;
                return taxaIdAry.map(function(recrdId){  //console.log("taxaObj = %O, rcrd = %O", taxonRecrdObjsAry[recrdId], taxaObjs[taxaNameMap[recrdId]], taxonRecrdObjsAry[recrdId]);
                    return taxonRecrdObjsAry[recrdId];
                });
            }
        }
        function initTopTaxa() {
            taxaNameMap[1] = 'Animalia';
            taxaNameMap[2] = 'Chiroptera';
            taxaNameMap[3] = 'Plantae';
            taxaNameMap[4] = 'Arthropoda';
            batTaxaRefObj = {
                Animalia: {
                    kingdom: "Animalia",
                    parent: null,
                    name: "Animalia",
                    level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
                    tempId: curTempId++
                },
                Chiroptera: {
                    kingdom: "Animalia",
                    parent: 1,              // 1 = animalia
                    name: "Chiroptera",
                    level: 4,
                    tempId: curTempId++
                },
            };
            objTaxaRefObj = {
                Animalia: {         //Repeated here because it will be collapsed in the merge process and animalia waas added as an ancestor antrhopoda very late in the writting of this code and restructuring didn't seen worth the effort and time.
                    kingdom: "Animalia",
                    parent: null,
                    name: "Animalia",
                    level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
                    tempId: 1
                },
                Plantae: {
                    kingdom: "Plantae",
                    parent: null,
                    name: "Plantae",
                    level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
                    tempId: curTempId++
                },
                Arthropoda: {           // concat names of taxa, and all parent levels present, are used as keys to later link taxa.
                    kingdom: "Animalia",
                    parent: 1,
                    name: "Arthropoda",
                    level: 2,
                    tempId: curTempId++
                },
            };
        } /* End initTopTaxa */
    } /* End buildTaxonObjs */
    /**
     * For subj and obj taxa, the previously extracted data (@extractTaxaCols) is used to create taxa records from the the most specific taxa level
     * with data in the record. The parent tree is derived from the remaining data in the higher level fields. These records are then linked back
     * into the interaction records they came from.
     */
    // function mergeTaxonObjs() { //console.log("mergeTaxonObjs. arguments = %O, entityObj = %O", arguments, entityObj)
    //  var taxonRecrdObjsAry = entityObj.taxaRcrdObjsAry;
    //  var recrdsObj = entityObj.curRcrds;
    //  // attachTempIds(taxonRecrdObjsAry);
    //  buildTaxaTree(recrdsObj);                   //          console.log("mergeTaxonObjs called. taxaRecrdObjsAry w ids = %O", taxonRecrdObjsAry);

    //  mergeTaxaIntoInteractions(recrdsObj);
    // }
    // /**
    //  * [buildTaxaTree description]
    //  * @param  {[type]} recrdsObj [description]
    //  * @return {[type]}           [description]
    //  */
    // function buildTaxaTree(recrdsObj) {//console.log("buildTaxaTree. arguments = %O, entityObj = %O", arguments, entityObj)
    //  var batTaxaRefObjAry, objTaxaRefObjAry;
    //  var nullKingdoms = {};
    //  var taxonRecrdObjsAry = entityObj.taxaRcrdObjsAry;
    //  var curTempId = 1;

    //  initTopTaxa();
    //  taxonRecrdObjsAry.forEach(function(recrd) { buildTaxaTree(recrd); });

    //  if (!isEmpty(nullKingdoms)) { rprtNullKingdoms() }

    //  entityObj.taxon.batTaxa = batTaxaRefObjAry;
    //  entityObj.taxon.objTaxa = objTaxaRefObjAry;  

    //  function buildTaxaTree(recrd) {
    //      var lvlAry = [7, 6, 5, 4, 3, 2, 1];
    //      var errors = false;

    //      buildSubjTaxa(recrd);
    //      buildObjTaxa(recrd);

    //      function buildSubjTaxa(recrd) {             //      console.log("subject recrd = %O", recrd)
    //          var batFields = JSON.parse(JSON.stringify(entityParams.taxon.subjCols));
    //          batFields.reverse();            //species, genus, family, order
    //          extractUnqTaxa(recrd, batTaxaRefObjAry, batFields, "subject");
    //      } /* End buildSubjTaxa */
    //      function buildObjTaxa(recrd) {   //   console.log("object recrd = %O", recrd)
    //          var objFields = JSON.parse(JSON.stringify(entityParams.taxon.objCols));
    //          objFields.reverse();        //all levels from species through kingdom
    //                                                                                                                                                                                  //  console.log("objFields = %O", objFields);
    //          extractUnqTaxa(recrd, objTaxaRefObjAry, objFields, "object");
    //      } /* End buildObjTaxa */
    //      function extractUnqTaxa(recrd, taxaObjs, fieldAry, role) { // console.log("recrd inside extractUnqTaxa = %O", recrd)
    //          var taxaParams = {
    //              recrd: recrd,
    //              taxaObjs: taxaObjs,
    //              fieldAry: fieldAry,
    //              role: role
    //          };
    //          fieldAry.some(function(field, idx) {
    //              if (recrd[field] !== null) {
    //                  taxaParams.field = field;
    //                  taxaParams.idx = idx;
    //                  foundMostSpecificLevel(taxaParams);
    //                  return true;
    //              }
    //          });
    //      }
    //      function foundMostSpecificLevel(tP) { //console.log("foundMostSpecificLevel called. tP = %O", tP);  // tP = taxaParams
    //          var nameConcatMethod = tP.role === "subject" ? concatSubjFieldsIntoKey : concatObjFieldsIntoKey;
    //          var taxonNameKey = nameConcatMethod(tP, tP.idx);
    //          isInRefObjOrAdd(taxonNameKey, tP.field, tP.idx, tP);
    //      }
    //      function concatSubjFieldsIntoKey(tP, idx) {
    //          var taxonNameStr = "";
    //          for (var i = 3; i >= idx; i--) {
    //              var curField = tP.fieldAry[i];
    //              taxonNameStr += tP.recrd[curField];
    //          }
    //          return taxonNameStr;
    //      }
    //      function concatObjFieldsIntoKey(tP, idx) {
    //          var taxonNameStr = "";
    //          for (var i = 6; i >= idx; i--) {
    //              var curField = tP.fieldAry[i];
    //              if (tP.recrd[curField] !== null) { taxonNameStr += tP.recrd[curField]; }
    //          }
    //          return taxonNameStr;
    //      }
    //      function isInRefObjOrAdd(taxonNameKey, field, idx, tP) {//      console.log("isInRefObjOrAdd called. taxonNameKey = ", taxonNameKey);
    //          if (!(taxonNameKey in tP.taxaObjs)) { buildTaxaObj(taxonNameKey, field, idx, tP); }
    //      }
    //      function buildTaxaObj(taxonNameKeyStr, field, idx, tP) {
    //          var level = lvlAry[idx];
    //          var kingdom = tP.
    //          role === "subject" ? "Animalia" : tP.recrd.objKingdom;
    //          var taxonName = (field === "objSpecies" || field === "subjSpecies") ? getSpecies(tP.recrd[field]) : tP.recrd[field];
    //          var parentTaxon = linkParentTaxon(tP, idx, taxonNameKeyStr);
    //          if (parentTaxon === null) { nullParentError(tP);
    //          } else {
    //              tP.taxaObjs[taxonNameKeyStr] = {
    //                  kingdom: kingdom,
    //                  parent: parentTaxon,
    //                  name: taxonName,
    //                  level: level,               // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
    //                  tempId: curTempId++
    //              };
    //          }
    //      }
    //      function getSpecies(genusSpeciesStr) {          //  console.log("getSpecies called. arguments = %O", arguments)
    //          var nameAry = genusSpeciesStr.split(" ");
    //          return nameAry[1];
    //      }
    //      function linkParentTaxon(tP, idx, taxonNameKeyStr) {// console.log("linkParentTaxon called. arguments = %O", arguments);
    //        if (idx === 6) { console.log("Error. Parent taxon idx too high. recrd = %O", tP.recrd); return null; }
    //          var parentIdx = getParentLevel(tP, idx);
    //          if (parentIdx === false) { return null; }
    //          var parentField = tP.fieldAry[parentIdx];  //console.log("parentField = ", parentField)
    //          var nameConcatMethod = tP.role === "subject" ? concatSubjFieldsIntoKey : concatObjFieldsIntoKey;
    //          var parentTaxonNameKey = nameConcatMethod(tP, parentIdx);

    //          isInRefObjOrAdd(parentTaxonNameKey, parentField, parentIdx, tP);

    //          return errors ? null : tP.taxaObjs[parentTaxonNameKey].tempId;
    //      }
    //      function getParentLevel(tP, idx) {  //  console.log("getParentLevel called. idx = ", idx)
    //          for (var i = ++idx; i <= 7; i++) {                      // if i ever gets to 7 then there is no value in kingdom(6)
    //              if (i === 7) { console.log("i=7. kingdom===null"); return false; }
    //              if (tP.recrd[tP.fieldAry[i]] !== null) { return i; }
    //          }
    //      }
    //      function nullParentError(tP) { // console.log("nullParentError tP = %O", tP)
    //          errors = true;
    //          if (nullKingdoms[tP.role] === undefined) { nullKingdoms[tP.role] = [] };
    //          nullKingdoms[tP.role].push(recrd);
    //          delete recrdsObj[tP.recrd.tempId];
    //      }
    //  } /* end buildTaxaTree */
    //  function rprtNullKingdoms() {
    //      if (entityObj.taxon.valRpt.rcrdsWithNullReqFields === undefined) { entityObj.taxon.valRpt.rcrdsWithNullReqFields = {}; };
    //      entityObj.taxon.valRpt.rcrdsWithNullReqFields.kingdom = nullKingdoms;
    //  }
    //  function initTopTaxa() {
    //    batTaxaRefObjAry = {
    //          Animalia: {
    //              kingdom: "Animalia",
    //              parent: null,
    //              name: "Animalia",
    //              level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
    //              tempId: curTempId++
    //          },
    //          Chiroptera: {
    //              kingdom: "Animalia",
    //              parent: 1,              // 1 = animalia
    //              name: "Chiroptera",
    //              level: 4,
    //              tempId: curTempId++
    //          },
    //    };
    //    objTaxaRefObjAry = {
    //          Animalia: {         //Repeated here because it will be collapsed in the merge process and animalia waas added as an ancestor antrhopoda very late in the writting of this code and restructuring didn't seen worth the effort and time.
    //              kingdom: "Animalia",
    //              parent: null,
    //              name: "Animalia",
    //              level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
    //              tempId: 1
    //          },
    //          Plantae: {
    //              kingdom: "Plantae",
    //              parent: null,
    //              name: "Plantae",
    //              level: 1,                   // Kingdom (1), Phylum (2), Class (3), Order (4), Family (5), Genus (6), Species (7)
    //              tempId: curTempId++
    //          },
    //          AnimaliaArthropoda: {           // concat names of taxa, and all parent levels present, are used as keys to later link taxa.
    //              kingdom: "Animalia",
    //              parent: 1,
    //              name: "Arthropoda",
    //              level: 2,
    //              tempId: curTempId++
    //          },
    //      };
    //   } /* End initTopTaxa */
    // } /* End buildTaxaTreeObjs */

 //  function mergeTaxaIntoInteractions(recrdsObj) {
 //     var batTaxa = entityObj.taxon.batTaxa; //console.log("batTaxa = %O", batTaxa)
 //     var objTaxa = entityObj.taxon.objTaxa;  //console.log("objTaxa = %O", objTaxa);

 //     for (var key in recrdsObj) { replaceTaxaStrWithObjIds(recrdsObj[key][0]); }

 //     mergeTaxaTreeObjsIntoInteractions(recrdsObj);

 //     function replaceTaxaStrWithObjIds(recrd) {
 //         var subjTaxonStr = recrd.subjTaxon;
 //         var objTaxonStr = recrd.objTaxon;
 //         recrd.subjTaxon = batTaxa[subjTaxonStr] !== undefined ? batTaxa[subjTaxonStr].tempId : console.log("subjTaxon not found. recrd = %O, subjTaxonStr = '%s'", recrd, subjTaxonStr);
 //         recrd.objTaxon = objTaxa[objTaxonStr] !== undefined ? objTaxa[objTaxonStr].tempId : console.log("objTaxon not found. recrd = %O, objTaxonStr = '%s'", recrd, objTaxonStr);
 //     }
 //  } /* End mergeTaxaIntoInteractions */
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
    /**
     * Checks for null citIds and, if found, quarantines those records.
     */
    function checkCitId() { //console.log("checkCitId called. arguments = %O", arguments);
        var nullCitRcrds = [];
        var recrdsObj = entityObj.curRcrds;

        for (var key in recrdsObj) {
            if (recrdsObj[key][0].citId === null) { nullCitRcrds.push(recrdsObj[key][0]); }
        }

        nullCitRcrds.forEach(function(rcrd){ delete recrdsObj[rcrd.tempId] });

        if (nullCitRcrds.length > 0) {
            entityObj.validationResults.rcrdsWithNullReqFields = {
                recordCnt: nullCitRcrds.length,
                recrds: nullCitRcrds,
                unqKey: ["citId"]
            };
        }
    }
/*--------------------------- Merge Entities Methods ------------------------------------- */
    /**
     * Links child entities references to their validated record object.
     * NOTE: This is currently dependent upon the final variable being prevEntityReslts and undefined 
     * except in the case of previous results needing to continue forward with those being merged.
     */
    function mergeEntities(fSysIdAry, parentEntity, childEntities, callback, prevEntityReslts) { //console.log("mergeEntities called. Arguments = ", arguments);
        var nullRefResults = {}, nullRefChildKeys = [];
        var dataSet = parentEntity.name;
        var parentRcrds = parentEntity.finalRecords;                                //       console.log("parentRcrds = %O", parentRcrds);
        var parentValRpt = parentEntity.valRpt
        var returnRecrdsObj = prevEntityReslts ?  prevEntityReslts : parentEntity;

        childEntities.forEach(function(subEntityObjMetaData) { replaceRefsWithPointers(subEntityObjMetaData); });
        if (parentValRpt.nullRefResults !== undefined) { removeNullRefRcrds(); }

        callback(fSysIdAry, returnRecrdsObj);

        function replaceRefsWithPointers(childParseResults) {               //   console.log("replaceRefsWithPointers. childParseResults = %O", childParseResults);
            var parentEntityRecrd, rcrdsAry;
            var childName = childParseResults.name; //console.log("childName = %s", childName);
            var childRecrds = childParseResults.finalRecords;               //   console.log("entityParams = %O", entityParams);
            var isCollection = "subEntityCollection" in entityParams[childName];
            var processMethod = isCollection ? processChildCollection : processSingleChildEntity;

            processParentEntity();

            function processParentEntity() {// console.log("parentRcrds = %O", parentRcrds);
                for (var key in  parentRcrds) {
                    parentEntityRecrd = parentRcrds[key][0];
                    processMethod(parentEntityRecrd, key); }
            }
            function processChildCollection(parentEntityRecrd, parentKey) {                                                     // console.log("isCollection")
                var childrenToReplace = parentEntityRecrd[childName];                                       // console.log("childrenToReplace= %O ",childrenToReplace);
                rcrdsAry = [];
                forEachChildInCollection(parentKey);
                replaceWithPointer(rcrdsAry, parentKey);

                function forEachChildInCollection(parentKey) {
                    childrenToReplace.forEach(function(childEntityRef){
                        matchRefInChildRecrds(childEntityRef, parentKey);
                        if (parentValRpt.nullRefResults!== undefined) { addNullRefResults(childName) }
                    });                                                                                                                                                 //  console.log("calling replacedWithPointer. rcrdsAry = %O", rcrdsAry);            }
                }
            } /* End processChildCollection */
            function processSingleChildEntity(parentEntityRecrd, parentKey) {                                                               // console.log("is not Collection")
              var refKey = entityParams[childName].unqKey[0];
                var unqKeyValToReplace = parentEntityRecrd[refKey];                                                     //   console.log("parentEntityRecrd = %O. unqKeyValToReplace = %s", parentEntityRecrd, unqKeyValToReplace);
                ifKeyValueIsNotNullFindKey(parentKey);

                function ifKeyValueIsNotNullFindKey(parentKey) {
                    if (unqKeyValToReplace === null) {
                        parentEntityRecrd[childName] = null;
                        delete parentEntityRecrd[refKey];
                    } else { matchRefInChildRecrds(unqKeyValToReplace, parentKey, refKey) } ;// console.log("unqKeyValToReplace = ", unqKeyValToReplace);
                }
            } /* End processSingleChildEntity */
            function matchRefInChildRecrds(unqKeyStrToReplace, parentKey, refKey) {                         // If key in obj, grab
                var matched = false;
                for (var childKey in childRecrds) { ifKeyValuesMatch(childKey, unqKeyStrToReplace, refKey); }
                if (!matched) { extractNullRefRecrd(parentKey, unqKeyStrToReplace) }

                function ifKeyValuesMatch(childKey, refVal, refKey) {
                    if (childKey == refVal) {                               //  if (childName === "location") {console.log("subEntity record match found. = %O.", childRecrds[childKey]);}
                        matched = true;
                        isCollection ? rcrdsAry.push(childRecrds[childKey][0]) : replaceWithPointer(childRecrds[childKey][0], refKey); //console.log("foundMatchingSubEntityObj");}
                    }
                }
            } /* End matchRefInChildRecrds */
            function extractNullRefRecrd(parentKey, unqKeyStrVal) {             //console.log("extractNullRefRecrd called. parentEntityRecrd = %O, childName = %s, unqKeyStrVal = %s", parentEntityRecrd, childName, unqKeyStrVal)
                if (parentValRpt.nullRefResults === undefined) { parentValRpt.nullRefResults = {}; }
                if (parentValRpt.nullRefResults[childName] === undefined) {
                    parentValRpt.nullRefResults[childName] = {};
                }
                parentValRpt.nullRefResults[childName][parentKey] = Object.assign({}, parentRcrds[parentKey]);  //console.log("nullRefResults = %O", nullRefResults);
                if (parentValRpt.nullRefResults[childName][parentKey].nullRefKeys === undefined) {parentValRpt.nullRefResults[childName][parentKey].nullRefKeys = []; }  //console.log("nullRefResults = %O", nullRefResults);
                parentValRpt.nullRefResults[childName][parentKey].nullRefKeys.push(unqKeyStrVal);  //console.log("nullRefResults = %O", nullRefResults);
            }
            function replaceWithPointer(matchedRecrd, refKey) {                                                                                 // console.log("replacedWithPointer called. matchedRecrd = %O",matchedRecrd);
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
     */
    function parseFileSetRecrds(fileSetObj, validationMode, callback) { //  console.log("parseFileSetRecrds called. arguments = %O", arguments);
        var csvRowEntities = ["author", "citation", "interaction"]; // console.log("parseFileSetRecrds. entityParams = %O", JSON.parse(JSON.stringify(entityParams)));
        var resultData = {};
        var curProg = 58;

        csvRowEntities.forEach(parseCsvContent);
        mergeParsedRecords(callback, validationMode);

        function parseCsvContent(entityName) {// console.log("parseCsvContent called.");
            var entityMetaData = Object.assign({}, entityParams[entityName]);// console.log("entityMetaData = %O", entityMetaData);
            var csvFileId = fileSetObj[entityName].fileId;
            var csvRcrdsAry = fileSetObj[entityName].orgRcrdAryObjs;
            curProg = curProg + 5;              //  console.log("parseCsvContent called. curProg = ", curProg);
            ein.tools.setProgress(curProg);
            resultData[entityName] = runParseChain(csvFileId, csvRcrdsAry, entityName);

            if ("subEntities" in entityMetaData) { entityMetaData.subEntities.forEach(parseSubEntity) }

            function parseSubEntity(subEntityName) { // console.log("parseSubEntity called.");
                curProg = curProg + 7;      //  console.log("parseSubEntity called. curProg = ", curProg);
                ein.tools.setProgress(curProg);
                resultData[subEntityName] = runParseChain(csvFileId, csvRcrdsAry, subEntityName);
            }
        } /* End parseCsvContent */
        function mergeParsedRecords(callback, validMode) {//console.log("mergeParsedRecords called. arguments = %O", arguments);
            var citSubAry = [resultData.publication, resultData.author];
            var intSubAry = [resultData.location];
            ein.tools.setProgress(93)
            ein.parse.mergeDataSet([], resultData.citation, citSubAry, mergeIntoInteractions)

            function mergeIntoInteractions(fSysIdAry, mergedCitRecrds) { // console.log("resultData = %O", resultData); // var cb = callback || null        //  console.log("resultData = %O", resultData);
                var valData = validMode ? resultData : false;
                storeTaxaResults();
                ein.tools.setProgress(96);
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
/*--------------General Helper Methods---------------------------------------------------- */
    /**
     * Attach temporary Ids incrementally to record objects so extracted data can be linked to the original record.
     * @param  {array} recrdsAry Colletion of record objects.
     * @return {array} A new collection of record objects with a tempId property
     */
    function attachTempIds(recrdsAry) { if (entityObj.name === 'interaction') {console.log("recrdsAry = %O", recrdsAry)}
        var id = 2;
        var orgnlRcrds = recrdsAry || entityObj.curRcrds;
        var newRecrds = orgnlRcrds.map(function(recrd){
            recrd.tempId = id++;
            return recrd;
        });   if (entityObj.name === 'interaction') {console.log("newRecrds = %O", newRecrds)}
        return newRecrds;
    }
    /**
     * Builds a new recordObj with a specified field of each record split into an array
     */
    function splitFieldIntoAry() {
        var nullRefAry = [];
        var splitField = entityObj.splitField;
        var newRecrdObj = {};
        var recrdsObj = entityObj.curRcrds;

        for (var key in recrdsObj) { newRecrdObj[key] = splitFields(key); }

        if (nullRefAry.length > 0) { addNullReqRefs(); }

        entityObj.curRcrds = newRecrdObj;
        /**
         * Splits a specified field of each record into an array on commas.
         * @param  {str} key  Top key for an array of records sharing unqKey field
         */
        function splitFields(key) {         //  console.log("splitFields called. recrdsObj[key] = %O", recrdsObj[key])
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
    /** returns true only if value isn't in array before current idx, i.e. only if it is unique thus far in the array. */
    function onlyUnique(val, idx, array) {// console.log("onlyUnique ", array.indexOf(val) === idx);
        return array.indexOf(val) === idx;
    }
}());