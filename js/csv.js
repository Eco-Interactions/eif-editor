(function(){
  /*
   * Global App Namespace
   * @type {object}
   */
  var ein = ECO_INT_NAMESPACE;
  /* RegEx strings to be used for comparassion methods. */
  var rxIsInt = /^\d+$/;
  var rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
  var rxNeedsQuoting = /^\s|\s$|,|"|\n/;    // If a string has leading or trailing space, contains a comma double quote or a newline, it needs to be quoted in CSV output
  /* Dictionary for standardized headers that should eventually become its own file when any more top keys are added */
  var hdrDict = {
    interactions: {
      "Primary or Secondary interaction": "directness",
      "Citation Number": "citId",
      "Citation Short Description": "citShortDesc",
      "Region": "region",
      "Location Description": "locDesc",
      "Country": "country",
      "Habitat Type": "habType",
      "Lat.": "lat",
      "Long.": "long",
      "Elev. (or Range Min)": "elev",
      "Elev. Range Max": "elevRangeMax",
      "Interaction Type": "intType",
      "Interaction Tags": "intTag",
      "Subject Order": "subOrder",    //add j to sub
      "Bat Family": "subFam",           //add level dict that links level to field (family, order, etc)
      "Bat Genus": "subGenus",
      "Bat Species": "subSpecies",        //
      "Plant/Arthropod": "objKingdom",
      "Object Class": "objClass",
      "Object Order": "objOrder",
      "Object Family": "objFamily",
      "Object Genus": "objGenus",
      "Object Species": "objSpecies"
    },
    authors: {
      "Short Name": "shortName",
      "Last": "last",
      "First": "first",
      "Middle": "middle",
      "Suffix": "suffix"
    },
    citation: {
      "Citation ID": "citId",
      "Citation Short Description": "citShortDesc",
      "Full Text": "fullText",
      "Authors": "authors",
      "Year": "year",
      "Title": "title",
      "Publication Title": "pubTitle",
      "Publication Type": "pubType",
      "Publisher": "publisher",
      "Volume": "vol",
      "Issue": "issue",
      "Pages": "pgs"
    }
  };
  /*  CSV API member on global namespace */
  ein.csvHlpr = {
    csvToObject: objectifyCSV,
  };

  /**
   * Converts a Comma Separated Values string into an array of objects.
   * Each row in the CSV becomes an object with properties properties after each column.
   * Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
   *
   * @param {int}  fSysId    file sytem id for the original file opened
   * @param {String}  s      The string containing CSV data to convert
   * @callback {func}  callback  Recieves the file dystem id and the objectified CSV
   * @return {Array}         The CSV parsed as an array of objects with column headers as keys for field data
   */
  function objectifyCSV(fSysId, s, callback, dataSet) { console.log("dataSet", dataSet);
    var csvArray = csvToArray(s);         // The CSV parsed as a two-dimensional array
    var keys = standardizeHeaders(csvArray.shift(), dataSet);     // Seperates first row of headers to be used as keys for field data

    /*
     * Converts a two-dimensional CSV array into an Array of Objects with headers as keys
     *
     * @param  {Object} row   An array of field data representing a record
     * @return {Array}        An array of objs with keyed field data representing each record
     */
    var recrdsAry = csvArray.map(function (row) {
      var obj = {};
      var len = keys.length;
      for (var i = 0; i < len; i += 1) {
        obj[keys[i]] = row[i];
      }
      return obj;
    });

    callback(fSysId, recrdsAry, dataSet);
  }

 /**
  * Converts a Comma Separated Values string into a two-dimensional array.
  * Each row in the CSV becomes an array of field data in an outer array container.
  * Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
  *
  * @param {String} s The string to convert
  * @return {Array}   The CSV parsed as an array
  */
  function csvToArray(s) {
    var cur = '';
    var insideQuote = false;
    var fieldQuoted = false;
    var field = '';                         // Buffer for building up the current field
    var row = [];
    var out = [];

    for (var i = 0; i < s.length; i += 1) {
      cur = s.charAt(i);                    // The character we are currently processing.
      if (isEndOfField()) {
        endField();
      } else {
        processCurChar(cur);
      }
    }

    field = processField(field);        // Add the last field
    row.push(field);
    out.push(row);
    return out;

  /*----------------------------------------------csvToArray Helper Functions----------------------------------*/
    /**
     * Checks whether currentCharacter indicates the end of current field
     * @return {Boolean}
     */
    function isEndOfField() {
      if (!insideQuote && (cur === ',' || cur === "\n")) {
        return true;
      }
      return false;
    }
    /**
     * Processes the field, appends to current row array, and flushes field container.
     * Checks for end of row and, if so, calls endRow().
     */
    function endField() {
      field = processField(field);
      row.push(field);
      if (cur === "\n") { endRow(); }
      field = '';
      fieldQuoted = false;
    }
    /**
     * Appends row to the output object and flushes row container.
     */
    function endRow() {
      out.push(row);                          // append row to output
      row = [];
    }
    /**
     * Checks whether current character is a quote (") and, if so, sets or unsets quote conditions.
     * If not a quote, indicating a change of parsing state, add character to current field.
     *
     * @param  {string} curChar  Current character being iterated through.
     */
    function processCurChar(curChar) {
      if (curChar !== '"') {                          // If cur is not a double quote("),
        field += curChar;                             // add it to the field buffer
      } else {
        if (!insideQuote) {                             // If we are not inside a quote currently, start a quote
          insideQuote = true;
          fieldQuoted = true;
        } else if (!escapedQuote()) {                   // It is not an escaped quote, so end quote
          insideQuote = false;
        }
      }
    }
    /**
     * If current character is a quote, ("), check whether it is an escaped quote, ("")
     * or whether the current quote is at an end.
     *
     * @return {boolean} Returns true if quote is escaped or false if quote conditions should end.
     */
    function escapedQuote() {
      if (s.charAt(i + 1) === '"') {              // Next char is ", so this is an escaped ", ("")
        field += '"';
        i += 1;                                   // Skip the next char
        return true;
      }
      return false;
    }
    /**
     * Takes a group of successive characters, a field, and prepares it to be added to a row.
     * If field is empty, field will be set to null.
     * If field is an integer or float, field is set to the numerical representation of the string.
     *
     * @param  {string} field   Group of chracters
     * @return {(string|int)}    Processed field returned as a trimmed string or an integer
     */
    function processField(field) {
      field = field.trim();
      if (fieldQuoted) {                                        // If field is quoted, return field
        return field;
      } else {
        if (field === '' || isPlaceholder()) {                                     // If field is empty set to null
          field = null;
        }
        if (rxIsInt.test(field) || rxIsFloat.test(field)) {
          field = +field;
        }
        return field;
      }

      function isPlaceholder() {
        return (field.charAt(0) === '-' && field.charAt(1) === '-');
      }
    };
  };    // End of csvToArray
  function standardizeHeaders(hdrArray, dataSet) {
    var dataSetHdrDict = hdrDict[dataSet];
    var newHdrs = hdrArray.map(function(hdr){
      return dataSetHdrDict[hdr];
    });  console.log("newHdrs = %O", newHdrs);  console.log("headers = %s", JSON.stringify(newHdrs));
    return newHdrs;
  }

}());
