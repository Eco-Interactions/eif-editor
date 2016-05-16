(function() {
	var ein = ECO_INT_NAMESPACE;
	ein.jsonHlpr = {
		save: buildJsonFile
	};

















function buildJsonFile(resultData) {			console.log("buildJsonFile called. rcrds = %O", resultData);
	var preppedData = {};
	buildAuthorObjs(resultData.author.finalRecords);
	// buildCitationObjs(resultData.citation.finalRecords);
	// buildPublicationObjs(resultData.publication.finalRecords);
	// buildLocationObjs(resultData.location.finalRecords);
	// buildInteractionObjs(resultData.interaction.finalRecords);







	function stripArray(rcrds) {
		var returnObj = {};
		for (var rcrd in rcrds) {
			returnObj[rcrd] = rcrds[rcrd][0];
		}
		return returnObj;
	}
	function buildAuthorObjs(rcrds) {
		var preppedObjs = {};
		var authRcrds = stripArray(resultData.author.finalRecords);  //console.log("rcrds = %s", JSON.stringify(stripArray(rcrds)))

		for (var rcrd in authRcrds) { preppedObjs[authRcrds[rcrd].tempId] = authRcrds[rcrd]; }

		preppedData.author = preppedObjs;
	}
	function buildCitationObjs(rcrds) {
		// body...
	}
	function buildPublicationObjs(rcrds) {
		// body...
	}
	function buildLocationObjs(rcrds) {
		// body...
	}
	function buildInteractionObjs(rcrds) {
		// body...
	}
} /* End buildJsonFile */








}()); /* End of namespacing anonymous function */