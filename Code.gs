/**
 * TamizhTech ERP - Google Sheets Backend Proxy
 * Deploy this code as a "Web App" in Google Apps Script.
 * Set "Who has access" to "Anyone".
 */

function doPost(e) {
  var output = { success: false, data: null, error: null };
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload provided");
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheetName = body.sheet;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      if (action === "SETUP_SHEET") {
        sheet = ss.insertSheet(sheetName);
        var headers = body.headers || [];
        if (headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
        }
        output.success = true;
        return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Sheet not found: " + sheetName + ". Please run the Setup first.");
      }
    }
    
    if (action === "GET_DATA") {
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        output.success = true;
        output.data = [];
        return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
      }
      
      var headers = data[0];
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var rowContent = data[i];
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            var val = rowContent[j];
            if ((headers[j] === "items" || headers[j] === "monthlyRevenue" || headers[j] === "paymentStatusBreakdown") && val) {
                try {
                    obj[headers[j]] = JSON.parse(val);
                } catch(err) {
                    obj[headers[j]] = val;
                }
            } else {
                obj[headers[j]] = val;
            }
        }
        result.push(obj);
      }
      output.success = true;
      output.data = result;
    } 
    else if (action === "APPEND_ROW") {
      var record = body.record;
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowData = [];
      for (var i = 0; i < headers.length; i++) {
         var val = record[headers[i]];
         if (val !== undefined && val !== null && typeof val === 'object') {
             rowData.push(JSON.stringify(val));
         } else {
             rowData.push(val === undefined ? "" : val);
         }
      }
      sheet.appendRow(rowData);
      output.success = true;
    }
    else if (action === "UPDATE_ROW") {
      var id = body.id;
      var record = body.record;
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idIndex = headers.indexOf("id");
      var rowIndex = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIndex] === id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex > -1) {
        var rowData = [];
        for (var i = 0; i < headers.length; i++) {
           var val = record[headers[i]];
           if (val !== undefined && val !== null && typeof val === 'object') {
               rowData.push(JSON.stringify(val));
           } else {
               rowData.push(val === undefined ? data[rowIndex-1][i] : val);
           }
        }
        sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
        output.success = true;
      } else {
        throw new Error("Record not found with ID: " + id);
      }
    }
    else if (action === "DELETE_ROW") {
      var id = body.id;
      var data = sheet.getDataRange().getValues();
      var idIndex = data[0].indexOf("id");
      var rowIndex = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIndex] === id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex > -1) {
        sheet.deleteRow(rowIndex);
        output.success = true;
      } else {
        throw new Error("Record not found with ID: " + id);
      }
    }
    else if (action === "GET_BY_ID") {
      var id = body.id;
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idIndex = headers.indexOf("id");
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][idIndex] === id) {
          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            var val = data[i][j];
            if ((headers[j] === "items" || headers[j] === "monthlyRevenue" || headers[j] === "paymentStatusBreakdown") && val) {
                try {
                    obj[headers[j]] = JSON.parse(val);
                } catch(err) {
                    obj[headers[j]] = val;
                }
            } else {
                obj[headers[j]] = val;
            }
          }
          output.success = true;
          output.data = obj;
          break;
        }
      }
      if(!output.success) throw new Error("Record not found");
    }
    else {
      throw new Error("Unknown action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    output.success = false;
    output.error = error.toString();
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  }
}
