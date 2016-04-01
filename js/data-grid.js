(function(){
  var ein = ECO_INT_NAMESPACE;
  var gridOptions = {
    columnDefs: getNewColDefs(),
    rowData: getTblData(),
  	enableColResize: true
  // rowSelection: 'multiple',
  // rowsAlreadyGrouped: true,
  // enableSorting: true,
  // unSortIcon: true,
  // showToolPanel: true,
  // toolPanelSuppressValues: true,
  // toolPanelSuppressPivot: true,
  // enableFilter: true,
  // rowHeight: 26,
  // onRowClicked: rowClicked
  };
  ein.dataGrid = {
  	init: initDataGrid,
  	fillData: buildDataGrid
  };

/* ================== Grid Methods ================================================= */

  function initDataGrid() {
    agGridGlobalFunc('#grid-cntnr', gridOptions);
  }

  function getNewColDefs() {
    return [
      {headerName: "Id", field: "id", width: 50},
      {headerName: "Interaction Type", field: "intType", width: 150},
      {headerName: "Int Tags", field: "intTag", width: 100},
      {headerName: "Subject Taxon", field: "subjTaxon", width: 200},
      {headerName: "Object Taxon", field: "objTaxon", width: 200},
      {headerName: "Habitat Type", field: "habType", width: 150},
      {headerName: "Region", field: "region", width: 150},
      {headerName: "Country", field: "country", width: 150},
      {headerName: "location", field: "locDesc", width: 150},
      {headerName: "Latitude", field: "lat", width: 100},
      {headerName: "Longitude", field: "long", width: 100},
      {headerName: "Elevation", field: "elev", width: 100},
      {headerName: "Elev. Max", field: "elevRangeMax", width: 100},
      {headerName: "Citation Short Description", field: "citShortDesc", width: 300},
      {headerName: "Title", field: "title", width: 400},
      {headerName: "Authors", field: "authors", width: 300},
      {headerName: "Publication", field: "pubTitle", width: 500},
      {headerName: "Type", field: "pubType", width: 200},
      {headerName: "Publisher", field: "publisher", width: 150},
      {headerName: "Volume", field: "vol", width: 100},
      {headerName: "Issue", field: "issue", width: 100},
      {headerName: "Pages", field: "pgs", width: 150},
    ];
  }
  function getTblData() {
    return [];
  }
function buildDataGrid(fSysIdAry, recrdsMetaData) {
	var recrdsObj = recrdsMetaData.finalRecords; console.log("recrdsObj = %O", recrdsObj);
	gridOptions.rowData = buildRowData(recrdsObj);
	// buildRowData(recrdsObj);
	gridOptions.api.destroy();
  agGridGlobalFunc('#grid-cntnr', gridOptions);
}//id, intype, intTag, subjTaxon, objTaxon, habType, Region, country, locDsc, lat, long, elev,
//elevRangeMax, citShortDesc, title, authors, pubTitle, pubType, publisher, vol, issue, pgs
function buildRowData(recrdsObj) { console.log("buildRowData called.");
	var dataRows = [];
		for (var key in recrdsObj) {// console.log("for each record called. record = %O", recrdsObj[key][0]);
		dataRows.push(translateRecrdIntoRow(recrdsObj[key][0]));
	}
		console.log("data rows about to be returned: %O", dataRows)
	return dataRows;

	function translateRecrdIntoRow(recrd) {
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
	var intTags = '';
	recrd.intTag.forEach(function(tag){
		intTags += tag + ', ';
	});
	return intTags;
}
function getTaxon(recrd, role) {
	var levels = { 1: "Species", 2: "Genus", 3: "Family", 4: "Order", 5: "Class", 6: "Kingdom" };
	var taxonLvl = recrd[role].level;
	var taxonName = taxonLvl === 1 ? recrd[role].parent.name : levels[recrd[role].level];
	taxonName += ' ' + recrd[role].name;
	return taxonName;
}
function getAuthors(recrd) {
	if (recrd.citation.author !== undefined && recrd.citation.author !== null) {
		var authors = '';
		recrd.citation.author.forEach(function(authorObj){ console.log("authorObj = %O", authorObj);
			authors += authorObj.shortName + ', ';
		});
		return authors;
	} else { return ''; }
}

}()); /* end of namespacing anonymous function */