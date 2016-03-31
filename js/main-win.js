(function(){
  var statusBar, devLogTxtArea, editorTxtArea;
  document.addEventListener("DOMContentLoaded", onDomLoaded);

  function onDomLoaded() {
    setDomElementVars();
    ECO_INT_NAMESPACE.editorTxtArea = document.getElementById("editor");
    ECO_INT_NAMESPACE.ui = {
      curFileId: null,
      devLog: function(label, obj) {  console.log('devLog called. obj = %O', obj);
        devLogTxtArea.value += label + ' = ' + JSON.stringify(obj, null, 2) + '\n \n';
        devLogTxtArea.scrollTop = devLogTxtArea.scrollHeight;
      },
      show: function(fileId, fileText) {   // console.log("show obj= %O", obj);
        ECO_INT_NAMESPACE.ui.curFileId = fileId;  console.log("show curFileId= ", ECO_INT_NAMESPACE.ui.curFileId);
        editorTxtArea.value = fileText;
      },
      setStatus: function(statusStr) { //console.log("-----------attempting to set status. statusStr = ", statusStr);
        statusBar.text = statusStr;
      },
      // initGrid: function()
    };
    initDragBar();
    buildGrid();
  }

  function setDomElementVars() {
    editorTxtArea = document.getElementById("editor");
    statusBar = document.getElementById("status-bar");
    devLogTxtArea = document.getElementById("dev-log");
  }

/* =================== Zartens UI Behaviors (self-contained) ======================= */

  function initDragBar() {
    document.getElementById("drag-bar").onmousedown = function (e) {
        e.preventDefault();
        window.onmousemove = function (e) {
        document.getElementById("left-pane").style.width = e.pageX + "px";
        };
    };
    window.onmouseup = function (e) { window.onmousemove = null; };
  }
/* ================== Grid Methods ================================================= */

  function buildGrid() { console.log("buildGrid")
    // var gridOptions = {
    //       columnDefs: getNewColDefs(),
    //       rowData: getTblData(),
    //       // rowSelection: 'multiple',
    //       // rowsAlreadyGrouped: true,
    //       // enableColResize: true,
    //       // enableSorting: true,
    //       // unSortIcon: true,
    //       // showToolPanel: true,
    //       // toolPanelSuppressValues: true,
    //       // toolPanelSuppressPivot: true,
    //       // enableFilter: true,
    //       // rowHeight: 26,
    //       // onRowClicked: rowClicked
    //   };
    var columnDefs = [
      {headerName: "Make", field: "make"},
      {headerName: "Model", field: "model"},
      {headerName: "Price", field: "price"}
    ];

    var rowData = [
      {make: "Toyota", model: "Celica", price: 35000},
      {make: "Ford", model: "Mondeo", price: 32000},
      {make: "Porsche", model: "Boxter", price: 72000}
    ];

    var gridOptions = {
      columnDefs: columnDefs,
      rowData: rowData
    };


    agGridGlobalFunc('#grid-cntnr', gridOptions);

  }

  function getNewColDefs() {
    return [
      {
        headerName: 'Interaction',
        children: [
          {headerName: "Id", field: "id", width: 150},
          {headerName: "Type", field: "intType"},
          {headerName: "Tags", field: "intTag"},
        ]
      },{
        headerName: 'Taxa',
        children: [
          {headerName: "Subject", field: "subjTaxon"},
          {headerName: "Object", field: "objTaxon"}
        ]
      }
    ];
  }
  function getTblData(argument) {
    return [
      { id: 1, intType: "Seed Dispersal", intTag: "Seed", subjTaxon: "Bat", objTaxon: "Plant" },
      { id: 2, intType: "Visitation", intTag: "Leaf", subjTaxon: "Bat", objTaxon: "Plant" },
      { id: 3, intType: "Consumpution", intTag: "Bug", subjTaxon: "Bat", objTaxon: "Anthropod" },
    ];
  }









}());  /* end of namespacing anonymous function */
