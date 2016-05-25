(function() {
	var ein = ECO_INT_NAMESPACE;
	ein.jsonHlpr = {
		serialize: buildJsonData
	};

/**
 * Splits record data into each of the contained entites in a json compatible format.
 * TODO: Needs to be made to recognize and work with existing ids, if they exist.
 * @param  {obj} resultData  Parsing result data
 * @return {string}          Entity objs split and linked by tempId references.
 */
function buildJsonData(resultData) {			console.log("buildJsonFile called. rcrds = %O", resultData);
	var preppedData = {};
	var refObj = {};

	buildAuthorObjs(resultData.author.finalRecords);
	buildPublicationObjs(resultData.publication.finalRecords);
	buildCitationObjs(resultData.citation.finalRecords);
	buildLocationObjs(resultData.location.finalRecords);
	buildTaxonObjs(resultData.taxon.finalRecords);
	buildInteractionObjs(resultData.interaction.finalRecords);
	// console.log("preppedData = %O", preppedData)
	return JSON.stringify(preppedData, null, 2);

	function stripArray(rcrds) {
		var returnObj = {};
		for (var rcrd in rcrds) {
			returnObj[rcrd] = rcrds[rcrd][0];
		}
		return returnObj;
	}
	function addTempIds(rcrds) {
		var id = 1;
		for (var key in rcrds) { rcrds[key].tempId = id++; }
		return rcrds;
	}
	function arrangeDataObjByKey(refObj) {
		var preppedObj = {};
		for (var key in refObj) { preppedObj[refObj[key].tempId] = refObj[key]; }
		return preppedObj;
	}
	function buildTaxonObjs(rcrds) {  	console.log("buildTaxonObjs called")
		for (var rcrd in rcrds) {
			rcrds[rcrd].parent = rcrds[rcrd].parent === null? null : rcrds[rcrd].parent.tempId;
			delete rcrds[rcrd].kingdom;
		}
		preppedData.taxon = rcrds;										//	console.log("taxon rcrds = %O", rcrds)
	}
	function buildAuthorObjs(rcrds) { 						console.log("buildAuthorObjs called")
		var preppedObjs = {};
		var authRcrds = stripArray(resultData.author.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))

		for (var rcrd in authRcrds) {
			var rcrd = authRcrds[rcrd];
			var suffix = rcrd.suffix ? " " + rcrd.suffix : "";
			preppedObjs[rcrd.tempId] = {
				fullName:  rcrd.first + " " + rcrd.middle + " " + rcrd.last + suffix,
				shortName: rcrd.shortName,
				lastName: rcrd.last
			}; }

		preppedData.author = preppedObjs;
	}
	function buildPublicationObjs(rcrds) {				console.log("buildPublicationObjs called")
		var preppedObjs = {};
		var rcrdsObj = stripArray(resultData.publication.finalRecords);  //console.log("rcrdsObj[Object.keys(rcrdsObj)[0]] = %O", rcrdsObj[Object.keys(rcrdsObj)[0]])
		var pubRcrds = rcrdsObj[Object.keys(rcrdsObj)[0]].id === undefined ? addTempIds(rcrdsObj) : rcrdsObj;

		for (var id in pubRcrds) {		
			var rcrd = pubRcrds[id];
			preppedObjs[rcrd.tempId] = {
				name: rcrd.pubTitle,
				tempId: rcrd.tempId
			};
			pubRcrds[rcrd]; }

		refObj.publication = pubRcrds;
		preppedData.publication = preppedObjs;
	}
	function buildCitationObjs(rcrds) {					console.log("buildCitationObjs called")
		var attrId = 1;
		var attributes = {};
		var preppedCits = {};
		var citRcrds = stripArray(resultData.citation.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))

		for (var id in citRcrds) {
			var rcrd = citRcrds[id];
			addAttributions(rcrd);

			preppedCits[rcrd.citId] = {			//Needs extra fields added
				description: rcrd.citShortDesc,
				fullText: rcrd.fullText,
				publication: getPubRefId(rcrd.publication),
				publicationIssue: rcrd.issue,
				publicationVolume: rcrd.vol,
				publicationPages: rcrd.pgs,
				title: rcrd.title,
				year: rcrd.year
			};
		}																																								console.log("citrecrds = %O", citRcrds);
		preppedData.attributions = attributes;
		preppedData.citation = preppedCits;

		function addAttributions(citRcrd) {
			citRcrd.author.forEach(function(author){
				attributes[attrId++] = {
					citation: citRcrd.citId,
					author: author.tempId
				};
			});
		}
	}
	function getAuthRefIds(authAry) {
		return authAry.map(function(auth){
			return auth.tempId;
		});
	}
	function getPubRefId(pubObj) { //console.log("pubId = %s", refObj.publication[pubObj.pubTitle].tempId)
		return pubObj === null ? null : refObj.publication[pubObj.pubTitle].tempId;
	}
	function buildLocationObjs(rcrds) {				console.log("buildLocationObjs called")
		var cntryId = regionId = habId = 1;
		var habitatType = {};
		var country = {};
		var region = {};
		var strippedRcrds = stripArray(resultData.location.finalRecords);  //console.log("rcrdsObj[Object.keys(rcrdsObj)[0]] = %O", rcrdsObj[Object.keys(rcrdsObj)[0]])
		var locRcrds = strippedRcrds[Object.keys(strippedRcrds)[0]].id === undefined ? addTempIds(strippedRcrds) : rcrdsObj;

		for (var rcrd in locRcrds) {
			locRcrds[rcrd].country = addCntryRef(locRcrds[rcrd].country);
			locRcrds[rcrd].region = addRegionRef(locRcrds[rcrd].region);
			locRcrds[rcrd].habitatType = addHabRef(locRcrds[rcrd].habType);
			delete locRcrds[rcrd].habType;
		}  console.log("locRcrds = %O", locRcrds);

		preppedData.country = arrangeDataObjByKey(country);
		preppedData.region = arrangeDataObjByKey(region);
		preppedData.habitatType = arrangeDataObjByKey(habitatType);  	console.log("preppedData = %O", preppedData);
		preppedData.location = rearrangeLocRcrds();

		function addCntryRef(countryName) {
			if (countryName === null) {return null}
			if (country[countryName] === undefined) { 
				country[countryName] = {
					tempId: cntryId++,
					name: countryName   }; 
			}
			return country[countryName].tempId;
		}
		function addRegionRef(regionName) {
			if (regionName === null) {return null}
			if (region[regionName] === undefined) { 
				region[regionName] = {
					tempId: regionId++,
					name: regionName  };
			}
		    return region[regionName].tempId;
		}
		function addHabRef(habitat) {
			if (habitat === null) {return null}
			if (habitatType[habitat] === undefined) { 
				habitatType[habitat] = {
					tempId: habId++,
					name: habitat 		}; 
			}
		    return habitatType[habitat].tempId;
		}
		function rearrangeLocRcrds() {
			var locObjs = {};
			for (var rcrd in locRcrds) { locObjs[locRcrds[rcrd].tempId] = locRcrds[rcrd];	}  console.log("locRcrds = %O, locObjs =%O", locRcrds, locObjs)
			return locObjs;
		}
	} /* End buildLocationObjs */
	function buildInteractionObjs(rcrds) {				console.log("buildInteractionObjs called")
		var intTagId = intTypeId = 1;
		var intTagObj = {};
		var intObjs = {};
		var intTypeObj = {};
		var preppedObj = {};
		var rcrdsObj = stripArray(rcrds);

		for (var key in rcrdsObj) {
			intObjs[key] = {};
			intObjs[key].citation = rcrdsObj[key].citation.citId;
			intObjs[key].location = rcrdsObj[key].location === null ? null : rcrdsObj[key].location.tempId;
			intObjs[key].tags = getIntTagRef(rcrdsObj[key].intTag);
			intObjs[key].interactionType = getIntTypeRef(rcrdsObj[key].intType);
			intObjs[key].subject = getTaxonRef(rcrdsObj[key].subjTaxon);
			intObjs[key].object = getTaxonRef(rcrdsObj[key].objTaxon);
		}  console.log("intObjs = %O, intTagObj = %O, intType = %O", intObjs, intTagObj, intTypeObj);

		preppedData.interaction = intObjs;
		preppedData.intTag = arrangeDataObjByKey(intTagObj);
		preppedData.intType = arrangeDataObjByKey(intTypeObj);

		function getIntTagRef(intTags) {
			if (intTags === null) { return null }
			return intTags.map(function(tagStr){
				if (intTagObj[tagStr] === undefined) { 
					intTagObj[tagStr] = {
						tempId: intTagId++,
						tag: tagStr		 };
				}
		  		return intTagObj[tagStr].tempId;
			});
		}
		function getIntTypeRef(intTypeStr) {
			if (intTypeStr === null) {return null}
			if (intTypeObj[intTypeStr] === undefined) { 
				intTypeObj[intTypeStr] = {
					tempId: intTypeId++,
					name: intTypeStr	  };
			}
		    return intTypeObj[intTypeStr].tempId;
		}
		function getTaxonRef(taxon) {
			return taxon.tempId;
		}
	} /* End buildInteractionObjs */
} /* End buildJsonFile */








}()); /* End of namespacing anonymous function */