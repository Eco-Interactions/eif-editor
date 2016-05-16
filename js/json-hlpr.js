(function() {
	var ein = ECO_INT_NAMESPACE;
	ein.jsonHlpr = {
		save: buildJsonFile
	};

















function buildJsonFile(resultData) {			console.log("buildJsonFile called. rcrds = %O", resultData);
	var preppedData = {};
	var refObj = {};
	buildAuthorObjs(resultData.author.finalRecords);
	buildPublicationObjs(resultData.publication.finalRecords);
	buildCitationObjs(resultData.citation.finalRecords);
	// buildLocationObjs(resultData.location.finalRecords);
	// buildInteractionObjs(resultData.interaction.finalRecords);







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
	function buildAuthorObjs(rcrds) { 						console.log("buildAuthorObjs called")
		var preppedObjs = {};
		var authRcrds = stripArray(resultData.author.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))

		for (var rcrd in authRcrds) { preppedObjs[authRcrds[rcrd].tempId] = authRcrds[rcrd]; }

		preppedData.author = preppedObjs;
	}
	function buildPublicationObjs(rcrds) {				console.log("buildPublicationObjs called")
		var preppedObjs = {};
		var rcrdsObj = stripArray(resultData.publication.finalRecords);  //console.log("rcrdsObj[Object.keys(rcrdsObj)[0]] = %O", rcrdsObj[Object.keys(rcrdsObj)[0]])
		var pubRcrds = rcrdsObj[Object.keys(rcrdsObj)[0]].id === undefined ? addTempIds(rcrdsObj) : rcrdsObj;

		for (var rcrd in pubRcrds) { preppedObjs[pubRcrds[rcrd].tempId] = pubRcrds[rcrd]; }

		refObj.publication = pubRcrds;
		preppedData.publication = preppedObjs;
	}
	function buildCitationObjs(rcrds) {					console.log("buildCitationObjs called")
		var citRcrds = stripArray(resultData.citation.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))

		for (var rcrd in citRcrds) {
			citRcrds[rcrd].author = getAuthRefIds(citRcrds[rcrd].author);
			citRcrds[rcrd].publication = getPubRefId(citRcrds[rcrd].publication);
		}		console.log("citrecrds = %O", citRcrds);

		preppedData.citation = citRcrds;
	}
	function getAuthRefIds(authAry) {
		return authAry.map(function(auth){
			return auth.tempId;
		});
	}
	function getPubRefId(pubObj) { //console.log("pubId = %s", refObj.publication[pubObj.pubTitle].tempId)
		return pubObj === null ? null : refObj.publication[pubObj.pubTitle].tempId;
	}
	function buildLocationObjs(rcrds) {
		// body...
	}
	function buildInteractionObjs(rcrds) {
		// body...
	}
} /* End buildJsonFile */








}()); /* End of namespacing anonymous function */