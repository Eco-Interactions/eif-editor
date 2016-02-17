(function(){
  var statusBar, devLogTxtArea, editorTxtArea;
  document.addEventListener("DOMContentLoaded", onDomLoaded);

  function onDomLoaded() {
    setDomElementVars();
    ECO_INT_NAMESPACE.ui = {
      devLog: function(label, obj) {  console.log('devLog called. obj = %O', obj);
        devLogTxtArea.value += label + ' = ' + JSON.stringify(obj, null, 2) + '\n \n';
        devLogTxtArea.scrollTop = devLogTxtArea.scrollHeight;
      },
      show: function(obj) {   // console.log("show obj= %O", obj);
        editorTxtArea.value = JSON.stringify(obj, null, 2);
      },
      setStatus: function(statusStr) {
        statusBar.value = statusStr;
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
