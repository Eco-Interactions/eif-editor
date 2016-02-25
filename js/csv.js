(function(){
  /**
   * Global App Namespace
   * @type {object}
   */
  var ein = ECO_INT_NAMESPACE;

  /**
   * RegEx strings to be used for comparassion methods.
   * @type {RegExp}
   */
  var rxIsInt = /^\d+$/;
  var rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
      // If a string has leading or trailing space,
      // contains a comma double quote or a newline
      // it needs to be quoted in CSV output
  var rxNeedsQuoting = /^\s|\s$|,|"|\n/;

  /**
   * CSV API member on global namespace
   * @type {Object}
   */
  ein.csvHlpr = {
    csvToObject: objectifyCSV,
  };

  /**
   * Converts a Comma Separated Values string into an array of objects.
   * Each row in the CSV becomes an object with properties named after each column.
   * Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
   *
   * @param {int} spH Spaceholder for superfluous data being passed in currently
   * @param {String} s The string containing CSV data to convert
   * @param  {[type]} test [description]
   * @return {Array} The CSV parsed as an array of objects
   */
  function objectifyCSV(spH, s, test) {

    var csvArray = csvToArray(s);                       // The CSV parsed as a two-dimensional array
    var keys = csvArray.shift();                        // Seperates first row of headers to be used as keys for field data

    /*
     * Converts a CSV two-dimensional array into objects with headers as keys
     * @param  {Object} row    An array of field data representing a record
     * @return {Array}    An array of objs with keyed field data representing each record
     */
    var parsedObj = csvArray.map(function (row) {
      var obj = {};
      var len = keys.length;
      for (var i = 0; i < len; i += 1) {
        obj[keys[i]] = row[i];
      }
      return obj;
    });

    /*
     * If in
     * @param  {[type]} !test [description]
     * @return {[type]}       [description]
     */
    if(!test) {
      ein.ui.show(null, JSON.stringify(parsedObj, null, 2));      // Outputs results as text to editorTxtArea
    } else {
      return true;
    }
  }

  /*
    Converts a Comma Separated Values string into a two-dimensional array.
    Each row in the CSV becomes an array of field data in an outer array container.
    Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
    @method csvToArray
    @return {Array} The CSV parsed as an array
    @param {String} s The string to convert
  */
  function csvToArray(s) {
    var cur = '';                           // The character we are currently processing.
    var insideQuote = false;
    var fieldQuoted = false;
    var field = '';                         // Buffer for building up the current field
    var row = [];
    var out = [];

    for (var i = 0; i < s.length; i += 1) {
      cur = s.charAt(i);

      if (!endOfFieldorRow()) {             // Process current character if not at End Of Field
        processCurChar(cur);
      } else {                              // If we are at an End Of Field or End Of Row
        field = processField(field);
        row.push(field);                       // Add the current field to the current row
        if (cur === "\n") {                       // If this is End Of Row
          out.push(row);                          // append row to output
          row = [];                               // and flush row
        }
        field = '';                            // Flush the field buffer
        fieldQuoted = false;
      }
    }

    field = processField(field);        // Add the last field
    row.push(field);
    out.push(row);
    return out;

  /*----------------------------------------------CSV to Array Helper Functions----------------------------------*/
    function endOfFieldorRow() {
      if (!insideQuote && (cur === ',' || cur === "\n")) {
        return true;
      }
      return false;
    }

    function escapedQuote() {
      if (s.charAt(i + 1) === '"') {              // Next char is ", so this is an escaped ", ("")
        field += '"';
        i += 1;                                   // Skip the next char
        return true;
      }
      return false;
    }

    function processCurChar(curChar) {
      if (curChar !== '"') {                          // If cur is not a double quote("), add it to the field buffer
        field += curChar;
      } else {
        if (!insideQuote) {                            // If we are not inside a quote currently, start a quote
          insideQuote = true;
          fieldQuoted = true;
        } else if (!escapedQuote()) {                 // It is not an escaped quote, so end quote
          insideQuote = false;
        }
      }
    }

    function processField(field) {
      field = field.trim();
      if (fieldQuoted) {                                        // If field is quoted, return field
        return field;
      } else {
        if (field === '') {                                     // If field is empty set to null
          field = null;
        }
        if (rxIsInt.test(field) || rxIsFloat.test(field)) {     // Convert unquoted numbers to their numeric representation
          field = +field;
        }
        return field;
      }
    };
  };


}());
