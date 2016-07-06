(function() {
	var ein = ECO_INT_NAMESPACE;

	ein.errReport = buildValidationReport;

	function buildValidationReport(resultData, callback) { // console.log("displayValidationResults called. arguments = %O", arguments);
		ein.tools.setProgress(98);
		var results = {};
		if (resultData.name !== undefined) { results[resultData.name] = resultData; }
		var resultObj = !(isEmpty(results)) ?  results : resultData;
		var valResults = extractValidationResults(resultObj); //console.log("Validation results = %O", valResults);
		var textRprt = generateRprt(valResults, resultObj);// console.log("textRprt = %s", textRprt);

		callback(textRprt, resultData)

	} /* End buildValidationReport */
	function extractValidationResults(resultData) {
		var valData = {};
		for (var topKey in resultData) { getEntityResultData(resultData[topKey]); }  //  console.log("Final valData = %O", valData);
		return valData;

		function getEntityResultData(entityResultData) {    //console.log("getEntityResultData metaData: %O", entityResultData);
			var curEntity = entityResultData.name;// console.log("curEntity = %s", curEntity);
			valData[curEntity] = { cleanRecrds: entityResultData.finalRecords };
			if (entityResultData.valRpt !== undefined) {
				valData[curEntity].parseRpt = getParseRpt(curEntity), //parseRpt
				valData[curEntity].valErrs = getValErrs(curEntity)//valErrs (conflicts, invalidNulls, nullRef)
			}

			function getValErrs() { // console.log("valErrors = ")
				var errFields = ['rcrdsWithNullReqFields', 'nullRefResults', 'shareUnqKeyWithConflictedData'];
				var errs = {};
				errFields.forEach(function(field){
				  if (entityResultData.valRpt[field] !== undefined) { errs[field] = entityResultData.valRpt[field]; }
				});
				return errs;
			}
			function getParseRpt() { // console.log("valErrors = ")
				var rptFields = ['autoFill', 'dupCnt'];
				var rpt = {};
				rptFields.forEach(function(field){
				  if (entityResultData.valRpt[field] !== undefined) { rpt[field] = entityResultData.valRpt[field]; }
				});
				return rpt;
			}
		} /* End getEntityResultData */
	} /* End extractValidMetaResults */
	function generateRprt(valData, resultData) {// console.log("generateRprt called. valData = %O, resultData = %O", valData, resultData);
		var conflictsStr = nullRefStr = invalidNullsStr = '';
		var introStr = getIntroStr();
		var divider = '---------------------------------------------------------------------------------------------------';
		var smlDivider = '-----------------------------------------';
		var rcrdsRmvdWithNullRefs = {};
		var conflictsStrAry = [];
		var nullRefStrAry = [];
		var invalidNullsStrAry = [];

		return buildRprt();

		function getIntroStr() {
  return `                                 Reference Table
---------------------------------------------------------------------------------------------------
Some column headers in the spreadsheets are long, have spaces, or otherwise make this report more difficult to format in a way that is easy to read.
These names have been replaced with shorter ones. The table below shows the column headers from the spreadsheets with their shortened equivalents.
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
|                                                    Interaction                                                    |                 Citation                 |        Author         |
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
| ----Interaction id explanation----                                                                                | Citation ID: citId                       | Short Name: shortName |
| Primary or Secondary interaction: (Merged with intTag)                                                            | Citation Short Description: citShortDesc | Last: last            |
| Citation Number: citId                                                                                            | Full Text: fullText                      | First: first          |
| Citation Short Description: citShortDesc                                                                          | Authors: author                          | Middle: middle        |
| Region: region                                                                                                    | Year: year                               | Suffix: suffix        |
| Location Description: locDesc                                                                                     | Publication Title: pubTitle              |                       |
| Country: country                                                                                                  | Publication Type: pubType                |                       |
| Habitat Type: habType                                                                                             | Publisher: publisher                     |                       |
| Lat.: lat                                                                                                         | Issue: issue                             |                       |
| Long.: long                                                                                                       | Pages: pgs                               |                       |
| Elev. (or Range Min): elev                                                                                        |                                          |                       |
| Elev. Range Max: elevRangeMax                                                                                     |                                          |                       |
| Interaction Type: intType                                                                                         |                                          |                       |
| Interaction Tags: intTag                                                                                          |                                          |                       |
| Subject Order, Bat Family, Bat Genus, Bat Species: subjTaxon*                                                     |                                          |                       |
| Object Kingdom, Object Phylum, Object Class, Object Order, Object Family, Object Genus, Object Species: objTaxon* |                                          |                       |
|                                                                                                                   |                                          |                       |
| *Only the most specific taxon for subject and object is shown.                                                    |                                          |                       |
+-------------------------------------------------------------------------------------------------------------------+------------------------------------------+-----------------------+
===================================================================================================
                            Data Validation Errors
===================================================================================================`;
		}
		function buildRprt() {
		  var rprtStrngs;
		  var errors = false;
		  var storedRprts = {};
		  var intSkipped = false;

		  valData.author && rptErrors("author");	//Reports need to be processed in a certain order
		  valData.citation && rptErrors("citation");
		  valData.interaction && rptErrors("interaction");  
		  valData.location && rptErrors("location");
		  valData.taxon && rptErrors("taxon");

		  if (!errors) { return false; }

		  invalidNullsStr += invalidNullsStrAry.join('\n' + smlDivider + '\n');
		  conflictsStr += conflictsStrAry.join('\n');
		  nullRefStr += nullRefStrAry.join('\n');
		  rprtStrngs = [introStr, nullRefStr, invalidNullsStr, conflictsStr].filter(function(str) { return str.length > 0 && str !== "\n"; });

		  return rprtStrngs.join('\n');

		  function rptErrors(entity) {
		    if (valData[entity].valErrs !== undefined && valData[entity].valErrs !== null) { buildRprtStrngs(valData[entity].valErrs, entity); }
		  }
		  function buildRprtStrngs(valErrs, entityName) {
		    var unqKeyDict = { shortName: "Short Name", locDesc: "Location Description" , citId: "Citation Id" };
		    if (nonNullErrType("nullRefResults")) { addNullRefs(valErrs.nullRefResults, entityName) }
		    if (nonNullErrType("rcrdsWithNullReqFields")) { addInvalidNulls(valErrs.rcrdsWithNullReqFields, entityName) }
		    if (nonNullErrType("shareUnqKeyWithConflictedData")) { addConflicts(valErrs.shareUnqKeyWithConflictedData, entityName) }

		    function nonNullErrType(errType) {
		      return valErrs[errType] !== null && valErrs[errType] !== undefined;
		    }
		    function addInvalidNulls(invldNullRprt, entityName) {  //console.log("%s invldNullRprt = %O",entityName, invldNullRprt);
		      var tempNullStrAry = [];
		      errors = true;
		      invalidNullsStr = divider + '\n  Fields required but left blank:\n' + divider + '\n';        // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
		      entityName === "location" && getLocNullRprt();
		      entityName === "author" && getAuthNullRprt();
		      entityName === "interaction" && getIntNullRprt();
		      entityName === "citation" && getCitNullRprt();
		      entityName === "taxon" && processTaxonNulLRprt();

		      invalidNullsStrAry.push(tempNullStrAry.join('\n'));

		      function getCitNullRprt() {
		        var tempIdAry = [];
		        invldNullRprt.recrds.forEach(function(recrd){ tempIdAry.push(recrd.citId); });

		        tempNullStrAry.push('\n--Author missing for citations on rows: ' + tempIdAry.join(', ') + '.');
		      }
		      function processTaxonNulLRprt() { //console.log("processTaxonNulLRprt called. invldNullRprt = %O", invldNullRprt)
		        var taxonStrAry = [];
		        for (var nullType in invldNullRprt) {
		          if (nullType === "kingdom") { getKingdomNullRprt(invldNullRprt[nullType]);
		          } else {
		            getTaxaRprtStr(invldNullRprt[nullType], nullType);
		          }
		        }
		        tempNullStrAry.push('\n' + taxonStrAry.join('\n'));

		        function getKingdomNullRprt(nullObj) {
		          for (var role in nullObj) {
		            var intIds = nullObj[role].map(function(recrd){ return recrd.tempId+1 });
		            var unqIds = [];
		            intIds.forEach(function(id){ if (unqIds.indexOf(id) === -1) {unqIds.push(id)} });
		            var recrdCnt = unqIds.length;
		            taxonStrAry.push('--There are ' + recrdCnt + ' interaction records missing an object kingdom: ' + unqIds.join(', ') + '.')
		          }
		        }
		        function getTaxaRprtStr(recrdsAry, nullType) {
		          var recrdCnt = recrdsAry.length;
		          var intIds = recrdsAry.map(function(recrd){ return recrd.tempId+1 });
		          if (nullType === "kingdom") { taxonStrAry.push('--There are ' + recrdCnt + ' interaction records missing an object kingdom: ' + intIds.join(', ') + '.')
		          } else {
		            taxonStrAry.push('--There are ' + recrdCnt + ' interaction records missing ' + nullType + ' taxon: ' + intIds.join(', ') + '.');
		          }
		        }
		      } /* End processTaxonNullRprt */
		      function getAuthNullRprt() {
		        tempNullStrAry.push('\n--Author Short Name missing for the following records: \n');
		        invldNullRprt.recrds.forEach(function(recrd){
		          tempNullStrAry.push('  On row ' + recrd.tempId + ': ' + addFieldsInRecrd(recrd, "tempId"));
		        });
		        // tempNullStrAry.push('\n');
		      }
		      function getIntNullRprt() {  //console.log("interaction Null rprt = %O", invldNullRprt);
		        var nullIds = [];
		        invldNullRprt.recrds.forEach(function(recrd){ nullIds.push(recrd.tempId); });
		        tempNullStrAry.push('\n--Citation ID missing for interaction records on rows: ' + nullIds.join(', ') + '.');
		      }
		      function getLocNullRprt() { //console.log("location invldNullRprt = %O", invldNullRprt);
		        var intLocRefObj = getIntIds();     //       console.log("intLocRefObj = %O", intLocRefObj);
		        getIds();
		        invldNullRprt.recrds.forEach(function(recrd){
		          tempNullStrAry.push(mergeLocDataWithIntIds(recrd) + addFieldsInRecrd(recrd));
		        });

		        function mergeLocDataWithIntIds(recrd) {
		          var concatLocData = concatLocFields(recrd);
		          var str = '\n-There are ' +  intLocRefObj[concatLocData].length + ' interactions that have this location data and no location description. Rows: '
		          return str + groupIntIds(intLocRefObj[concatLocData]) + '\n ';
		        }
		        function getIds() {  //console.log("invldNullRprt.concatLocFields = %O", invldNullRprt.concatLocFields)
		          invldNullRprt.concatLocFields = concatFieldsInLocs();  //console.log("invldNullRprt.concatLocFields = %O", invldNullRprt.concatLocFields)
		          invldNullRprt.intIds = intLocRefObj;
		        }
		        function concatFieldsInLocs() {
		          return invldNullRprt.recrds.map(function(recrd){
		            var str = '';
		            for (var key in recrd) { if (recrd[key] !== null) { str += recrd[key] }}
		            return str;
		          });
		        }
		        function getIntIds(recrd) {
		          var refObj = {};
		          resultData.interaction.orgRcrdAry.forEach(getIntsForInvalidLocs);
		          return refObj;

		          function getIntsForInvalidLocs(intRcrd) {
		            intRcrd.locDesc === null && nonCollapsableData(intRcrd) && concatLocData(intRcrd);
		          }
		          function nonCollapsableData(intRcrd) {
		            var locFieldsNull = ['elev', 'elevRangeMax', 'lat', 'long'].every(function(field) { return intRcrd[field] === null; });
		            return !locFieldsNull;
		          }
		          function concatLocData(intRcrd) {                     // console.log("intRcrd = %O", intRcrd);
		            var concatIntLocData = concatLocFields(intRcrd);      //   console.log("concatLocData called. concatIntLocData = %O", concatIntLocData)
		            if (!(concatIntLocData in refObj)) { refObj[concatIntLocData] = []; }
		            refObj[concatIntLocData].push(intRcrd.tempId-1);
		          }
		        } /* End getIntIds */
		      } /* End getLocNullRprt */
		    } /* End addInvalidNulls */
		    function concatLocFields(rcrd) {
				var concatLocFields = '';
				var locFields = ['elev', 'elevRangeMax', 'lat', 'long', 'region', 'country', 'habType'];
				locFields.forEach(function(field){ if(rcrd[field] !== null) { concatLocFields += rcrd[field] }});  //console.log("concatLocFields = ", concatLocFields)
					return concatLocFields;
		    }
		    function addConflicts(conflictObj, entityName) { 					// console.log("conflictObj = %O, entityName = %s", conflictObj, entityName);
				var tempConflictsStrAry = [];
				errors = true;
				conflictsStr = divider + '\n  Conflicting data.\n' + divider + '\n';  // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.

				if (entityName === "location") { getIntIdsForRcrds(); //console.log("conflictObj.intIds = %O", conflictObj.intIds);
				} else if (entityName === "taxon") { buildtaxaConflictRprt(conflictObj);
				} else { conflictsStrAry.push('\n-- ' + 'There are ' + conflictObj.conCnt + ' ' + entityName + ' records with the same ' + unqKeyDict[conflictObj.unqKey] + ' and conflicting data in other fields.'); }

				for (var sharedKey in conflictObj.recrds) {
					tempConflictsStrAry.push('\n-' + conflictObj.unqKey + ': ' + sharedKey + '\n' + buildConflictRprts(conflictObj.recrds[sharedKey], sharedKey));
				}
				conflictsStrAry.push(tempConflictsStrAry.join('\n' + smlDivider + '\n') + '\n' + divider );

				function buildtaxaConflictRprt(taxaConflicts) {  			//	 console.log("buildTaxaRprt. taxaConflicts = %O", taxaConflicts);
					var tempStrAry = [];
					var gRprt = [];
					var tRprt = [];
					var gCnflctCnt = 0;
					var tCnflctCnt = 0;
					var intRcrds = [];
					var gConflctStrngs = { subject: [], object: [] };
					var tConflctStrngs = { subject: {}, object: {} };
					var fields = {
						subject: ['subjSpecies', 'subjGenus', 'subjFam', 'subjOrder'],
						object: ['objSpecies', 'objGenus', 'objFam', 'objOrder', 'objClass', 'objPhylum', 'objKingdom']
					};

					for (var conflct in taxaConflicts) {//  console.log("conflict = ", conflct)
						for (var role in taxaConflicts[conflct]) {
							if (conflct === "conflictedGenus") { getGenusConflicts(taxaConflicts[conflct][role], role); // taxonConflicts[conflct].forEach(addGenusConflct); 
							} else { getTaxaConflicts(taxaConflicts[conflct][role], role, conflct) }
						}
					}
					combineAllRprts();
					if (intRcrds.length > 0) {tempConflictsStrAry.push(taxonInfoStr(), tempStrAry.join('\n')); }

					function getGenusConflicts(roleConflicts, role) {// console.log("getGenusConflicts called.")
						for (var taxon in roleConflicts) {
							roleConflicts[taxon].forEach(function(conflctdRcrd) {
								addGenusConflct(role, taxon, conflctdRcrd)
							});
						} 
					} /* End getGenusConflicts */
					function getTaxaConflicts(roleConflicts, role, conflctdField) { 				// console.log("getTaxonConflct called.")
						for (var taxon in roleConflicts) {
							for (var parentTaxon in roleConflicts[taxon]){
								roleConflicts[taxon][parentTaxon].forEach(function(conflctdRcrd) {
									addTaxonConflct(role, taxon, parentTaxon, conflctdRcrd, conflctdField)
								});
							}
						}
					}
					function addGenusConflct(role, taxon, conflctdRcrd) {  							// console.log("addGenusConflct called. arguments = %O", arguments)
						++gCnflctCnt;
						if ( intRcrds.indexOf(conflctdRcrd.tempId) === -1 ) { intRcrds.push(conflctdRcrd.tempId); }
						gConflctStrngs[role].push('Row ' + conflctdRcrd.tempId + ': Genus name "' 
							+ conflctdRcrd[fields[role][1]] + '" conflicts with Species "' + conflctdRcrd[fields[role][0]] + '".');
					}
					function addTaxonConflct(role, taxon, parentTaxon, conflctdRcrd, conflctdField) {	//	console.log("addTaxonConflct called. arguments = %O", arguments)
						++tCnflctCnt;
						if ( intRcrds.indexOf(conflctdRcrd.tempId) === -1 ) { intRcrds.push(conflctdRcrd.tempId); }
						initProps();
						tConflctStrngs[role][conflctdField][taxon][parentTaxon].push(conflctdRcrd.tempId);

						function initProps() {
							if ( tConflctStrngs[role][conflctdField] === undefined ) { tConflctStrngs[role][conflctdField] = {}; }
							if ( tConflctStrngs[role][conflctdField][taxon] === undefined ) { tConflctStrngs[role][conflctdField][taxon] = {}; }
							if ( tConflctStrngs[role][conflctdField][taxon][parentTaxon] === undefined ) { tConflctStrngs[role][conflctdField][taxon][parentTaxon] = []; }
						}
					}
					function taxonInfoStr() {
						return '\n--There are ' + intRcrds.length + ' rows with conflicted taxon data.';
					}
					function genusConflictInfoStr() {
						return '-There are ' + gCnflctCnt + ' taxa records where the Genus does not match the Species entered.';
					}
					function taxaConflictInfoStr() {  
						return '-There are ' + tCnflctCnt + ' taxa records with conflicted data in their parent chain.';
					}
					function combineAllRprts() {
						var gRprt = [], tRprt = [];
						if (gCnflctCnt > 0) { gRprt = [ genusConflictInfoStr(), gRoleStrngs(gConflctStrngs), smlDivider ]; }  		
						if (tCnflctCnt > 0) { tRprt = [ taxaConflictInfoStr(), tRoleStrngs(tConflctStrngs) ]; }				
						tempStrAry = gRprt.concat(tRprt);
					}
					function gRoleStrngs(conflctStrngs) {
						var strngs = [];
						for (var role in conflctStrngs) {
							if (conflctStrngs[role].length > 0) {
								strngs.push(('\n' + ucfirst(role) + ' Taxon:'), conflctStrngs[role].join('\n'));
							}
						}
						return strngs.join('\n');
					}
					function tRoleStrngs(conflctStrngs) {  						//console.log("tRoleStrngs(conflctStrngs) = %O", conflctStrngs)
						var strngs = [];
						var fieldMap = {
							"subjFam": "Family",   "objFam": "Family", 
							"subjOrder": "Order",  "objOrder": "Order", 
							"objClass": "Class",   "objPhylum": "Phylum", "objKingdom": "Kingdom" 
						};
						var fields = ["Species", "Genus", "Family", "Order", "Class", "Phylum", "Kingdom"];
						for (var role in conflctStrngs) {
							if (!isEmpty(conflctStrngs[role])) { strngs.push(('\n' + ucfirst(role) + ' Taxon:')); }
							getTaxaConflictStrs(conflctStrngs[role]);
						}

						function getTaxaConflictStrs(roleConflicts) { 
							for (var level in roleConflicts) {
								var prevLvl = fields[fields.indexOf(fieldMap[level]) - 1]; 
								strngs.push(smlDivider + '\n--"'+ fieldMap[level] + '" conflicts:');
								getFieldConflictStrs(roleConflicts[level], level);
							}

							function getFieldConflictStrs(levelConflicts, level) {
								for (var taxonName in levelConflicts) {
									strngs.push('\n-' + prevLvl + ' ' + taxonName + ': ');
									getParentConflictStrs(levelConflicts[taxonName], level);
								}
							}
							function getParentConflictStrs(taxonConflicts, level) {
								for (var parentTaxon in taxonConflicts){
									var sortedIds = taxonConflicts[parentTaxon].sort(ascNumericSort); // console.log("sortedIds = ", sortedIds)
									strngs.push(taxonConflicts[parentTaxon].length + 
										' records with ' + fieldMap[level] + ' "' + parentTaxon + '" on Rows: ' + groupIntIds(sortedIds));
								}
							}
						} /* End getTaxaConflictStrs */
						return strngs.join('\n');
					}/* End tRoleStrngs */
				} /* End buildtaxaConflictRprt */
				function buildConflictRprts(recrdsAry, sharedKey) {
					var tempRprt = [];
					var locIntRcrds = [];     //'\n'- to seperate by one additional line the int ids and the location field data.
					recrdsAry.forEach(function(recrd, idx) {
						entityName === "location" && tempRprt.push(buildLocConflictRprt(recrd, idx));
						if (entityName === "citation" || entityName === "author" ) { 
							tempRprt.push('      ' + addFieldsInRecrd(recrd, conflictObj.unqKey, ["tempId"])); 
						}
					});
					entityName === "location" && tempRprt.push(locIntRcrds.join(''));
					return tempRprt.join('\n');

					function buildLocConflictRprt(recrd, idx) {
						var concatLocKey = concatLocFields(recrd);
						var intConflictIntro = '\n   Data Set ' + (idx + 1) + ' found in ' + conflictObj.intIds[sharedKey][concatLocKey].length + ' Interaction records at rows: ';
						locIntRcrds.push(intConflictIntro + groupIntIds(conflictObj.intIds[sharedKey][concatLocKey]));
						return '      Data Set ' + (idx + 1) + '- ' + addFieldsInRecrd(recrd, conflictObj.unqKey);
					}
				} /* End buildConflictRprts */
				function getIntIdsForRcrds() {  								// console.log("storedRprts.locNullRefs = %O", storedRprts.locNullRefs);
					var nullRefRslts = storedRprts.locNullRefs;
					conflictObj.intIds = {};

					conflictsStrAry.push("\n--Location Descriptions that have conflicting data in other location fields:");

					for (var locDescKey in nullRefRslts.intIdRefs) { // console.log("locDescKey = ", locDescKey);
						var refObj = conflictObj.intIds[locDescKey] = {};

						nullRefRslts.intIdRefs[locDescKey].forEach(function(intId){  				// console.log("%s intId = %s, orgIntRcrds = %O", locDescKey, intId, resultData.interaction.orgRcrdAry);
							var locFieldsStr = concatLocFields(resultData.interaction.orgRcrdAry[intId-2]);				// console.log("locDescKey %s. resultData.interaction.orgRcrdAry[intId-2] = %O", locDescKey,  resultData.interaction.orgRcrdAry[intId-2]);
							if (!(locFieldsStr in refObj)) { refObj[locFieldsStr] = [] }
							refObj[locFieldsStr].push(intId-1);
						});
					}                                           				// console.log("conflictObj.intIds = %O", conflictObj.intIds);
				}
		    } /* End addConflicts */
		    function groupIntIds(intIdAry) {  									// console.log("groupIntIds called. intIdAry = %O", arguments[0]);
		      var procSeq, lastSeqId;
		      var idSeqAry = [];
		      intIdAry.forEach(function(id, i){      							// console.log("id = %s, i=%s", id, i)
		        if (i === 0) {
		          procSeq = lastSeqId = id;
		          if (intIdAry.length === 1) { finalSeq(id) }
		          return;
		        }
		        if (i === intIdAry.length-1) { finalSeq(id)
		        } else if (+id !== +lastSeqId+1) { resetSeq(id);
		        } else { lastSeqId = id; }
		      });   //console.log("idSeqAry joined = %s", idSeqAry.join(', '))
		      return idSeqAry.join(', ') + '.';

		      function resetSeq(id) {     //     console.log("resetSeq. procSeq = %s,  id = %s, lastSeqId=%s", procSeq, id, lastSeqId);
		        if (+lastSeqId != +procSeq) { procSeq = ++procSeq + '-' + ++lastSeqId;
		        } else { procSeq = ++procSeq; }
		        idSeqAry.push(procSeq);
		        procSeq = lastSeqId = id;
		      }
		      function finalSeq(id) {    //   console.log("finalSeq. id = %s, procSeq = %s", id, procSeq);
		        if (+id === +procSeq) { procSeq = ++procSeq;
		        } else if (+id === +lastSeqId+1){ procSeq = ++procSeq + '-' + ++id;
		        } else { procSeq = ++procSeq + '-' + ++lastSeqId + ', ' + ++id }
		        idSeqAry.push(procSeq);
		      }
		    } /* End groupIntIds */
		    function addNullRefs(nullRefResults, entityName) { //console.log("addNullRefs called. %s nullRefs = %O", entityName, nullRefResults);
		      var tempNullRefStrAry = [];
		      errors = true;

		      if ("location" in nullRefResults) { processLocNullRefs(nullRefResults.location); }   //location null refs are reported later in the conflicts report, so these are isolated from the nullRefStr init to keep this section from displaying if locations are the only null refs to report.
		      if ("citation" in nullRefResults) {
		        nullRefStr = divider + '\n  Rows referenced but not found:\n' + divider;   // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
		        processCitNullRefs(nullRefResults, nullRefResults.citation);
		      }
		      if ("author" in nullRefResults) {
		        nullRefStr = divider + '\n  Rows referenced but not found:\n' + divider;   // After processing, only if there are invalid nulls to report, this needs to be at the start of the string returned to report all invalid nulls, once and only if there are any at all to report. This is not the way this goal should be accomplished ultimately.
		        processAuthorNullRefs(nullRefResults.author);
		      }

		      nullRefStrAry.push(tempNullRefStrAry.join('\n'));

		      function processLocNullRefs(locNullRefs) {  //  console.log("locNullRefs = %O", locNullRefs);
		        var intLocRefs = {};
		        for (var intId in locNullRefs) {// console.log("locNullRefs[intId] = %O", locNullRefs[intId]);
		          var locNullObj = locNullRefs[intId];
		          if (!(locNullObj[0].locDesc in intLocRefs)) { intLocRefs[locNullObj[0].locDesc] = [] }
		            intLocRefs[locNullObj[0].locDesc].push(intId);
		        }                                                 // console.log("intLocRefs = %O", intLocRefs)
		        storedRprts.locNullRefs = { intIdRefs: intLocRefs };
		      }
		      function processCitNullRefs(nullRefResults, citNullRefs) { //console.log("nullRefResults = %O", nullRefResults);
		        var citRcrdsRmvdWithNullRefs = rcrdsRmvdWithNullRefs.citation || false;          //       console.log("citRcrdsRmvdWithNullRefs @@ rcrdsRmvdWithNullRefs = %O", rcrdsRmvdWithNullRefs);
		        var citRefsToRmvdRcrds = 0;
		        var returnStrAry = [];
		        var citRefs = {};
		        for (var key in citNullRefs) { if(citNullRefs[key][0] !== undefined) { processCitRef(); } }

		        if (citRcrdsRmvdWithNullRefs) { returnStrAry.push('  There are ' + citRefsToRmvdRcrds + ' Interaction records with references to the above ' + citRcrdsRmvdWithNullRefs.length + ' Citation records that have validation errors.\n');}

		        if (!isEmpty(citRefs)) {returnStrAry.push(buildCitRefRprtStr(citRefs));}

		        tempNullRefStrAry.push(returnStrAry.join('\n'));

		        function processCitRef() {
		          if (citRcrdsRmvdWithNullRefs && citRcrdsRmvdWithNullRefs.indexOf(parseInt(citNullRefs[key][0].citId)) > -1) { citRefsToRmvdRcrds++;
		          } else {
		            if (citRefs[citNullRefs[key][0].citId] === undefined) { citRefs[citNullRefs[key][0].citId] = []; }
		            citRefs[citNullRefs[key][0].citId].push(key-1);
		          }
		        }
		      } /* End processCitNullRefs */
		      function buildCitRefRprtStr(citRefs) { //console.log("buildCitRefRprtStr arguments = %O", arguments)
		        var strAry = [];
		        for ( var citId in citRefs ) {
		          strAry.push('--Citation ' + citId + ' does not exist in the imported citation data and is referenced by ' + citRefs[citId].length + ' Interaction records on rows ' + groupIntIds(citRefs[citId]));
		        }
		        return '\n' + strAry.join('\n') + '\n';
		      }
		      function processAuthorNullRefs(authorNullRefs) {        //        console.log("processAuthorNullRefs. authorNullRefs = %O", authorNullRefs);
		        var tempAuthRefObj = {};
		        var str = '';
		        var authStrAry = [];
		        rcrdsRmvdWithNullRefs.citation = [];
		        for(var key in authorNullRefs) {
		          if (authorNullRefs[key][0] !== undefined) {
		            rcrdsRmvdWithNullRefs.citation.push(parseInt(key));  // console.log("rcrdsRmvdWithNullRefs.citation pushing now");
		            processAuth();
		          }
		        }
		        authStrAry.push(buildAuthRefReturnStr(tempAuthRefObj, rcrdsRmvdWithNullRefs.citation.length) + '\n');
		        tempNullRefStrAry.push(authStrAry.join('\n'));

		        function processAuth() {
		          if (typeof authorNullRefs[key][0] === "object") {
		            if (tempAuthRefObj[authorNullRefs[key].nullRefKeys] === undefined) { tempAuthRefObj[authorNullRefs[key].nullRefKeys] = []; };
		              tempAuthRefObj[authorNullRefs[key].nullRefKeys].push(key);
		          }
		        }
		        function buildAuthRefReturnStr(tempAuthRefObj, citRecCnt) {           //    console.log("buildAuthRefReturnStr. tempAuthRefObj = %O", tempAuthRefObj);
		          var strAry = ['\n--There are ' + citRecCnt + ' Citation records which reference Author short names not found in the Author data.\n',
		                        '  Short Name             |  Citation IDs ', '---------------------------------------------'];
		          var padding = '                       '; //23

		          for (var auth in tempAuthRefObj) {
		            strAry.push('  ' + pad(padding, auth) + '|  ' + pad (padding, tempAuthRefObj[auth].join(', ')));
		          }
		          return strAry.join('\n');
		        }
		      } /* End processAuthorNullRefs */
		    } /* End addNullRefs */
		    function processAuthFields(authRcrdsAry) { console.log("processAuthFields. arguments = %O", arguments);
		      var authStr = '';
		      authRcrdsAry.forEach(function(recrd){ //console.log("authRcrdsAry loop. recrd = %O, authStr = ", recrd, authStr);
		        authStr += 'Author (shortName): ' + recrd.shortName + ',' + addFieldsInRecrd(recrd, 'shortName') + ' ';
		      });                                                                   //console.log("authStr = ", authStr);
		      return authStr;
		    }
		    function addFieldsInRecrd(recrd, unqKey, skipKeyAry) { //console.log("addFieldsInRecrd. arguments = %O", arguments);
		      var skipKeyAry = skipKeyAry || [];
		      var tempStrAry = [];
		      for (var field in recrd) {// console.log("field = %s, recrd = %O", field, recrd)
		        if (skipKeyAry.indexOf(field) > -1) { continue } //console.log("field = ", field);
		        if (field === unqKey || recrd[field] === null || recrd[field] === undefined) { continue }
		        if (typeof recrd[field] === "string" || typeof recrd[field] === "number") {
		          tempStrAry.push(' ' + field + ': ' + recrd[field]);
		        } else if (field === "author") { tempStrAry.push('Author (shortName): ' + recrd[field][0]);
		        } else { tempStrAry.push(addFieldsInRecrd(recrd[field])); }
		      }
		      return tempStrAry.join(', ');
		    } /* End addFieldsInRecrd */
		  } /* End buildRprtStr */
		} /* End buildRprt */
	} /* End generateRprt */
/*-----------------------Util Helpers---------------------------------*/
	function pad (pad, str, padLeft) {
		if (padLeft) {
			return (pad + str).slice(-pad.length);
		} else {
			return (str + pad).substring(0, pad.length);
		}
	}
	/**
	* Checks if an object is empty
	* @return {Boolean}     Returns false if key is found.
	*/
	function isEmpty(obj) {
		for (var x in obj) { return false; }
		return true;
	}
  	function ucfirst(string) { 
		return string.charAt(0).toUpperCase() + string.slice(1); 
	}
	/** Comparisson filter param for .sort. (ascending numerical order:  a1.sort(ascNumericSort)); */
	function ascNumericSort(a,b) {
	  return a-b;
	}
}());