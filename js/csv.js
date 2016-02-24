(function(){
  var ein = ECO_INT_NAMESPACE;
  var csvHlpr;
  var rxIsInt = /^\d+$/;
  var rxIsFloat = /^\d*\.\d+$|^\d+\.\d*$/;
      // If a string has leading or trailing space,
      // contains a comma double quote or a newline
      // it needs to be quoted in CSV output
  var rxNeedsQuoting = /^\s|\s$|,|"|\n/;
  var uniqKeys = {
    authors: "Short Name",
    citations: "",
    interactions: ""
  };
  ein.csvHlpr = {
    csvToObject: functionName,
    csvToArray: functionName
  };             // members are csvToObject and csvToArray
  csvHlpr = ein.csvHlpr;


  /*
    Converts a Comma Separated Values string into an array of objects.
    Each row in the CSV becomes an object with properties named after each column.
    Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
    @method csvToObject
    @return {Array} The CSV parsed as an array of objects
    @param {int} spH Spaceholder for superfluous data being passed in currently
    @param {String} s The string containing CSV data to convert
  */
  csvHlpr.csvToObject = function (spH, s) {

    var csvArray = csvToArray(s);
    var columns = csvArray.shift();

    var parsedObj = csvArray.map(function (row) {  console.log("row = ", row);
      var obj = {};
      var len = columns.length;
      for (var i = 0; i < len; i += 1) {  console.log("obj = %O ", obj);
        obj[columns[i]] = row[i];
      }
      return obj;
    });

    var uniqdObj = removeDuplicates(parsedObj);

    ein.ui.show(null, JSON.stringify(uniqdObj, null, 2));
  }

  /*
    Converts a Comma Separated Values string into a two-dimensional array.
    Each row in the CSV becomes an array of field data in an outer array container.
    Empty fields are converted to nulls and non-quoted numbers are converted to integers or floats.
    @method csvToArray
    @return {Array} The CSV parsed as an array
    @param {String} s The string to convert
  */
  function csvToArray(s) {  console.log("String = ", s);

    var cur = ''; // The character we are currently processing.
    var inQuote = false;
    var fieldQuoted = false;
    var field = ''; // Buffer for building up the current field
    var row = [];
    var out = [];

    for (var i = 0; i < s.length; i += 1) {
      cur = s.charAt(i);

      // If we are at a EndOfField or EndOfRow
      if (inQuote === false && (cur === ',' || cur === "\n")) {
        field = processField(field);
        // Add the current field to the current row
        row.push(field);
        // If this is EOR append row to output and flush row
        if (cur === "\n") {
          out.push(row);
          row = [];
        }
        // Flush the field buffer
        field = '';
        fieldQuoted = false;
      } else {
        // If it's not a ", add it to the field buffer
        if (cur !== '"') {
          field += cur;
        } else {
          if (!inQuote) {
            // We are not in a quote, start a quote
            inQuote = true;
            fieldQuoted = true;
          } else {
            // Next char is ", this is an escaped "
            if (s.charAt(i + 1) === '"') {
              field += '"';
              // Skip the next char
              i += 1;
            } else {
              // It's not escaping, so end quote
              inQuote = false;
            }
          }
        }
      }
    }
    field = processField(field);        // Add the last field
    row.push(field);
    out.push(row);                      console.log("out = ", out);
    return out;
  };

  function processField(field) {
    var trimmedField = field.trim();
    if (fieldQuoted !== true) {
      // If field is empty set to null
      if (field === '') {
        field = null;
      // If the field was not quoted, trim it
      } else {
        field = trimmedField;
      }

      // Convert unquoted numbers to numbers
      if (rxIsInt.test(trimmedField) || rxIsFloat.test(trimmedField)) {
        field = +trimmedField;
      }
    }
    return field;
  };

  /**
   * Remove duplicates from the parsed CSV object
   * @param  {Array} records The CSV parsed as an array of objects
   * @return {Array} The CSV as an array of objects with identified duplicates removed
   */
  function removeDuplicates(records) {
    var result = {};                                 console.log("org length = ", records.length);

    for (i = 0; i < records.length; i++) {
        var record = records[i];
        var uniqFild = uniqKeys.authors;
        result[ record[uniqFild] ] = record;
    }
    var i = 0;
    var uniqRecordsAry = [];
    for(var record in result) {
        uniqRecordsAry[i++] = result[record];
    }                                               console.log("new length = ", uniqRecordsAry.length);

    return uniqRecordsAry;

  }


}());

//   @example
// var books,
//   csv = 'title,author,year\n' +
//     'JavaScript: The Good Parts,"Crockford, Douglas",2008\n' +
//     'Object-Oriented JavaScript,"Stefanov, Stoyan",2008\n' +
//     'Effective JavaScript,"Herman, David",2012\n';
// books = CSV.csvToObject(csv);
// // books now equals:
// // [
// //   {
// //     title: 'JavaScript: The Good Parts',
// //     author: 'Crockford, Douglas',
// //     year: 2008
// //   },
// //   {
// //     title: 'Object-Oriented JavaScript',
// //     author: 'Stefanov, Stoyan',
// //     year: 2008
// //   },
// //   {
// //     title: 'Effective JavaScript',
// //     author: 'Herman, David',
// //     year: 2012
// //   }
// // ];
//
//         //CSV TO ARRAY LEFTOVERS
        // @param {Object} [config] Object literal with extra configuration. For historical reasons setting config to `true` is the same as passing `{trim: true}`, but this usage is deprecated and will likely be removed in the next version.
        // @param {Boolean} [config.trim=false] If set to True leading and trailing whitespace is stripped off of each non-quoted field as it is imported
        // @for CSV
        // @static
        // @example
        //     var books,
        //       csv = 'JavaScript: The Good Parts,"Crockford, Douglas",2008\n' +
        //         'Object-Oriented JavaScript,"Stefanov, Stoyan",2008\n' +
        //         'Effective JavaScript,"Herman, David",2012\n';
        //     books = CSV.csvToArray(csv);
        //     // books now equals:
        //     // [
        //     //   ['JavaScript: The Good Parts', 'Crockford, Douglas', 2008],
        //     //   ['Object-Oriented JavaScript', 'Stefanov, Stoyan', 2008],
        //     //   ['Effective JavaScript', 'Herman, David', 2012]
        //     // ];
        //
        //             // // Get rid of any trailing \n
        // s = chomp(s);

        // if (config === true) {
        //   config = {
        //     trim: true
        //   };
        // } else {
        //   config = config || {};
        // }


        // csvHlpr.chomp = function (s) {
        //   if (s.charAt(s.length - 1) !== "\n") {
        //     // Does not end with \n, just return string
        //     return s;
        //   }
        //   // Remove the \n
        //   return s.substring(0, s.length - 1);
        // };

