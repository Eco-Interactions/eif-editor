/* background-pg.js - the main background script for the app  */
/* =========================================================  */
/* Not much going on here, just open the main Enso window.    */
/*                                                            */
/* The four vars and access of screen-size, center the window */
/* on the screen the first time the app is run. Note that all */
/* chrome apps store and maintain window size and location,   */
/* reopening windows as they were on last execution, so those */
/* values are ignored once the window is moved or resized     */

chrome.app.runtime.onLaunched.addListener(function() {
	var width = 900;
	var height = 300;
	var left = (screen.width/2)-(width/2);
	var top = (screen.height/2)-(height/2);
	chrome.app.window.create('views/main-win.html', {
		id: 'main-win',
    	outerBounds: { top: top, left: left, width: width, height: height }});
});