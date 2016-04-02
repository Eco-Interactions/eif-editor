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
      }
    };
    initDragBar();
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
}());  /* end of namespacing anonymous function */
