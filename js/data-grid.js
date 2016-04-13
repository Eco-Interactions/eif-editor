(function(){
  var ein = ECO_INT_NAMESPACE;
  var gridOptions = {
    columnDefs: getNewColDefs(),
    rowData: null,
  	enableColResize: true,
  	enableSorting: true,
  	unSortIcon: true,
  	enableFilter: true,
  // rowSelection: 'multiple',
  // rowsAlreadyGrouped: true,
  // showToolPanel: true,
  // toolPanelSuppressValues: true,
  // toolPanelSuppressPivot: true,
  // rowHeight: 26,
  // onRowClicked: rowClicked
  };
  ein.dataGrid = {
  	 buildConfig: buildDataGrid
  };

/* ================== Grid Methods ================================================= */

  function getNewColDefs() {
    return [
      {headerName: "Id", field: "id", width: 50,  filter: 'number'},
      {headerName: "Interaction Type", field: "intType", width: 150},
      {headerName: "Int Tags", field: "intTag", width: 100},
      {headerName: "Subject Taxon", field: "subjTaxon", width: 200, filter: 'text'},
      {headerName: "Object Taxon", field: "objTaxon", width: 200, filter: 'text'},
      {headerName: "Habitat Type", field: "habType", width: 150},
      {headerName: "Region", field: "region", width: 150},
      {headerName: "Country", field: "country", width: 150},
      {headerName: "Location Description", field: "locDesc", width: 150, filter: 'text'},
      {headerName: "Latitude", field: "lat", width: 100, filter: 'number'},
      {headerName: "Longitude", field: "long", width: 100, filter: 'number'},
      {headerName: "Elevation", field: "elev", width: 100, filter: 'number'},
      {headerName: "Elev. Max", field: "elevRangeMax", width: 100, filter: 'number'},
      {headerName: "Citation Short Description", field: "citShortDesc", width: 300, filter: 'text'},
      {headerName: "Title", field: "title", width: 400, filter: 'text'},
      {headerName: "Authors", field: "authors", width: 300, filter: 'text'},
      {headerName: "Publication", field: "pubTitle", width: 500, filter: 'text'},
      {headerName: "Publisher", field: "publisher", width: 100, filter: 'text'},
      {headerName: "Type", field: "pubType", width: 100, filter: 'text'},
      {headerName: "Vol.", field: "vol", width: 50, filter: 'number'},
      {headerName: "Issue", field: "issue", width: 50, filter: 'number'},
      {headerName: "Pages", field: "pgs", width: 100, filter: 'number'},
    ];
  }
function buildDataGrid(recrdsObj, callback) {// console.log("buildDataGrid begun @ ", Date.now());
	gridOptions.rowData = buildRowData(recrdsObj);

	callback(gridOptions);
}
function buildRowData(recrdsObj) {// console.log("buildRowData called.");
	var dataRows = [];
		for (var key in recrdsObj) {// console.log("for each record called. record = %O", recrdsObj[key][0]);
		dataRows.push(translateRecrdIntoRow(recrdsObj[key][0]));
	}																																											//console.log("data rows about to be returned: %O", dataRows)
	return dataRows;

	function translateRecrdIntoRow(recrd) {// console.log("recrd = %O", recrd)
		var row =  {
			id: recrd.tempId,
			intType: recrd.intType,
			intTag: getIntTags(recrd),
			subjTaxon: getTaxon(recrd, "subjTaxon"),
			objTaxon: getTaxon(recrd, "objTaxon"),
		};
		return addAllRemainingPresentData(recrd, row);
	}
	function addAllRemainingPresentData(recrd, row) {
		return addLocationData(recrd, row);
	}
	function addLocationData(recrd, row) {
		if (recrd.location !== null && recrd.location !== undefined) {
			row.habType = recrd.location.habType,
			row.region = recrd.location.region,
			row.country =recrd.location.country,
			row.locDesc = recrd.location.locDesc,
			row.lat =recrd.location.lat,
			row.long = recrd.location.long,
			row.elev = recrd.location.elev,
			row.elevRangeMax = recrd.location.elevRangeMax
		}
		return addCitationData(recrd, row);
	}

	function addCitationData(recrd, row) {
		if (recrd.citation !== null && recrd.citation !== undefined) {
			row.citShortDesc = recrd.citation.citShortDesc,
			row.title = recrd.citation.title,
			row.authors = getAuthors(recrd),
			row.vol = recrd.citation.vol,
			row.issue = recrd.citation.issue,
			row.pgs = recrd.citation.pgs
			if (recrd.citation.publication !== null && recrd.citation.publication !== undefined) {
				row.pubTitle = recrd.citation.publication.pubTitle,
				row.pubType = recrd.citation.publication.pubType,
				row.publisher = recrd.citation.publication.publisher
			}
		}
		return row;
	}
} /* End buildRowData */
function getIntTags(recrd) {
	var intTags = [];
	recrd.intTag.forEach(function(tag){
		intTags.push(tag);
	});
	return intTags.join(', ');
}
function getTaxon(recrd, role) {	//			console.log("getTaxon arguments = %O", arguments);
	var levels = { 1: "Kingdom", 2: "Phylum", 3: "Class", 4: "Order", 5: "Family", 6: "Genus", 7: "Species" };
	var taxonLvl = recrd[role].level;
	var taxonName = taxonLvl === 7 ? recrd[role].parent.name : levels[recrd[role].level];
	taxonName += ' ' + recrd[role].name;
	return taxonName;
}
function getAuthors(recrd) {
	if (recrd.citation.author !== undefined && recrd.citation.author !== null) {
		var authors = [];
		recrd.citation.author.forEach(function(authorObj){ //console.log("authorObj = %O", authorObj);
			authors.push(authorObj.shortName);
		});
		return authors.join(', ');
	} else { return ''; }
}

}()); /* end of namespacing anonymous function */