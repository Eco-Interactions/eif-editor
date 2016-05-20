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
		for (var key in refObj) { preppedObj[refObj[key]] = key; }
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
			preppedObjs[rcrd.tempId] = {
				fullName:  rcrd.first + rcrd.middle + rcrd.last + rcrd.suffix,
				shortName: rcrd.shortName,
				lastName: rcrd.last
			}; }

		preppedData.author = preppedObjs;
	}
	function buildPublicationObjs(rcrds) {				console.log("buildPublicationObjs called")
		var preppedObjs = {};
		var rcrdsObj = stripArray(resultData.publication.finalRecords);  //console.log("rcrdsObj[Object.keys(rcrdsObj)[0]] = %O", rcrdsObj[Object.keys(rcrdsObj)[0]])
		var pubRcrds = rcrdsObj[Object.keys(rcrdsObj)[0]].id === undefined ? addTempIds(rcrdsObj) : rcrdsObj;

		for (var id in pubRcrds) {			// Additional publicagtion fields remain
			var rcrd = pubRcrds[rcrd];
			preppedObjs[rcrd.tempId] = {
				name: rcrd.pubTitle,

			};
			pubRcrds[rcrd]; }

		refObj.publication = pubRcrds;
		preppedData.publication = preppedObjs;
	}
	function buildCitationObjs(rcrds) {					console.log("buildCitationObjs called")
		var attrId = 1;
		var citRcrds = stripArray(resultData.citation.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))
		var attributes = {};
		var preppedCits = {};

		for (var id in citRcrds) {
			var rcrd = citRcrds[id];
			addAttributions(rcrd);

			preppedCits[rcrd.citId] = {			//Needs extra fields added
				description: rcrd.shortDesc,
				publication: getPubRefId(rcrd.publication),
				fullText: rcrd.fullText,
				publicationIssue: rcrd.issue
			};
		}																																								console.log("citrecrds = %O", citRcrds);
		preppedData.citation = preppedCits;
		preppedData.attributions = attributes;

		function addAttributions(citRcrd) {
			citRcrd.authors.forEach(function(author){
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
			if (country[countryName] === undefined) { country[countryName] = cntryId++; }
			return country[countryName];
		}
		function addRegionRef(regionName) {
			if (regionName === null) {return null}
			if (region[regionName] === undefined) { region[regionName] = regionId++; }
		  return region[regionName];
		}
		function addHabRef(habitat) {
			if (habitat === null) {return null}
			if (habitatType[habitat] === undefined) { habitatType[habitat] = habId++; }
		  return habitatType[habitat];
		}
		function rearrangeLocRcrds() {
			var locObjs = {};
			for (var rcrd in locRcrds) { locObjs[locRcrds[rcrd].tempId] = locRcrds[rcrd];	}  console.log("locRcrds = %O, locObjs =%O", locRcrds, locObjs)
			return locObjs;
		}
	} /* End buildLocationObjs */
	function buildInteractionObjs(rcrds) {				console.log("buildInteractionObjs called")
		var intTagId = intTypeId = 1;
		var preppedObj = {};
		var intTagObj = {};
		var intTypeObj = {};
		var intObjs = stripArray(rcrds);

		for (var key in intObjs) {
			intObjs[key].citation = intObjs[key].citation.citId;
			intObjs[key].location = intObjs[key].location === null ? null : intObjs[key].location.tempId;
			intObjs[key].intTag = getIntTagRef(intObjs[key].intTag);
			intObjs[key].intType = getIntTypeRef(intObjs[key].intType);
			intObjs[key].subjTaxon = getTaxonRef(intObjs[key].subjTaxon);
			intObjs[key].objTaxon = getTaxonRef(intObjs[key].objTaxon);
		}  console.log("intObjs = %O, intTagObj = %O, intType = %O", intObjs, intTagObj, intTypeObj);

		preppedData.intObjs = intObjs;
		preppedData.intTag = arrangeDataObjByKey(intTagObj);
		preppedData.intType = arrangeDataObjByKey(intTypeObj);

		function getIntTagRef(intTags) {
			if (intTags === null) {return null}
			return intTags.map(function(tag){
				if (intTagObj[tag] === undefined) { intTagObj[tag] = intTagId++; }
		  	return intTagObj[tag];
			});
		}
		function getIntTypeRef(intTypeStr) {
			if (intTypeStr === null) {return null}
			if (intTypeObj[intTypeStr] === undefined) { intTypeObj[intTypeStr] = intTypeId++; }
		  return intTypeObj[intTypeStr];
		}
		function getTaxonRef(taxon) {
			return taxon.tempId;
		}
	} /* End buildInteractionObjs */
} /* End buildJsonFile */








}()); /* End of namespacing anonymous function */