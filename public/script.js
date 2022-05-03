/* global tableau json2csv Papa xml2js */

///////////////////////////////////////////////////////////////////////
// JSON & XML Web Data Connector																		 //
// A Tableau Web Data Connector for connecting to XML and JSON data. //
// Author: Keshia Rose                                               //
// GitHub: https://github.com/KeshiaRose/JSON-XML-WDC                //
// Version 1.1                                                       //
///////////////////////////////////////////////////////////////////////

//////////////////////// Test data URLs //////////////////////////////
// https://json-xml-wdc.herokuapp.com/food.json                     //
// https://json-xml-wdc.herokuapp.com/orders.xml                    //
// https://api.covid19india.org/data.json                           //
// https://covidtracking.com/api/v1/states/daily.json               //
// https://clinicaltrials.gov/ct2/show/NCT03478891?displayxml=true  //
//////////////////////////////////////////////////////////////////////

let cachedTableData; // Always a JSON object

let myConnector = tableau.makeConnector();

myConnector.init = async function(initCallback) {
  tableau.authType = tableau.authTypeEnum.custom;

  if (tableau.phase == tableau.phaseEnum.authPhase) {
    if (tableau.phase == tableau.phaseEnum.authPhase) {
      let conData = JSON.parse(tableau.connectionData);
      $("#submitAuthBtn").css('display', 'block');
      $("#nextBtn").css('display', 'none');
      $("#url").val(conData.dataUrl);
      $("#url").prop('disabled', true);
    }
  }
  else if (tableau.phase == tableau.phaseEnum.gatherDataPhase) {
    var token = await _getToken(tableau.password);
    let conData = JSON.parse(tableau.connectionData);
    conData = { ...conData, token };
    tableau.connectionData = JSON.stringify(conData);
  }

  initCallback();
};

// Create the schemas for each table
myConnector.getSchema = function(schemaCallback) {
  console.log("Creating table schemas.");
  let conData = JSON.parse(tableau.connectionData);
  let dataString = conData.dataString;
  let dataUrl = conData.dataUrl;
  let tables = conData.tables;
  let method = conData.method;
  let headers = conData.headers;
  let username = tableau.username || "";
  let token = conData.token;
  let tableSchemas = [];

  // TODO
  let jsonData = [
    {
      //folders
      "value": [
          {
          "Key": "b3996f91-67e6-4a27-8522-63281333ff06",
          "DisplayName": "Shared",
          "FullyQualifiedName": "Shared",
          "FullyQualifiedNameOrderable": "Shared",
          "Description": null,
          "ProvisionType": "Automatic",
          "PermissionModel": "FineGrained",
          "ParentId": null,
          "ParentKey": null,
          "IsActive": true,
          "FeedType": "Processes",
          "Id": 342038
        }
      ]
    },
    {
      "value": [
        {
          "Key": "9a514234-32dc-4457-ba03-598a0af3ea42",
          "StartTime": "2021-10-01T00:07:45.85Z",
          "EndTime": "2021-10-01T00:07:53.583Z",
          "State": "Successful",
          "JobPriority": "Normal",
          "SpecificPriorityValue": null,
          "Source": "Agent",
          "SourceType": "Agent",
          "BatchExecutionKey": "9a514234-32dc-4457-ba03-598a0af3ea42",
          "Info": "Job completed",
          "CreationTime": "2021-10-01T00:07:45.85Z",
          "StartingScheduleId": null,
          "ReleaseName": "001_GLOBAL_SimpleTest",
          "Type": "Attended",
          "InputArguments": "",
          "OutputArguments": "{}",
          "HostMachineName": "USTA445900",
          "HasMediaRecorded": false,
          "PersistenceId": null,
          "ResumeVersion": null,
          "StopStrategy": null,
          "RuntimeType": "Development",
          "RequiresUserInteraction": true,
          "ReleaseVersionId": 159471,
          "EntryPointPath": null,
          "OrganizationUnitId": 616397,
          "OrganizationUnitFullyQualifiedName": "Research and Development/001_GLOBAL_SimpleTest",
          "Reference": "",
          "ProcessType": "Process",
          "ProfilingOptions": null,
          "ResumeOnSameContext": false,
          "LocalSystemAccount": "autogen\\snakka02@amgen.com_local",
          "OrchestratorUserIdentity": null,
          "Id": 10325449,
          "Tenant": null
        }
      ]
    },
    {
      "value": [
        {
          "Key": "am\\agunaydi",
          "UserName": "am\\agunaydi",
          "LastLoginDate": "2022-02-22T10:51:26.127Z",
          "MachinesCount": 1,
          "IsLicensed": false,
          "IsExternalLicensed": false,
          "ActiveRobotId": null,
          "LicenseType": null,
          "Tenant": null
        }
      ]
    },
    {
      "ExpireDate": 1654041599,
      "Allowed": {
          "Headless": 0,
          "StudioX": 300,
          "Attended": 0,
          "Unattended": 0,
          "NonProduction": 0,
          "Development": 0,
          "StudioPro": 2,
          "TestAutomation": 0,
          "AutomationCloud": 0
      },
      "Used": {
          "Headless": 0,
          "StudioX": 118,
          "Attended": 1,
          "Unattended": 0,
          "NonProduction": 0,
          "Development": 0,
          "StudioPro": 3,
          "TestAutomation": 0,
          "AutomationCloud": 0
      },
      "Tenant": null
    }
  ];

  for (let table in tables) {
    let tableData = _jsToTable(jsonData[table], tables[table].fields);
    let headers = tableData.headers;
    let cols = [];
    let aliases = [];

    function findFriendlyName(f, tryNum) {
      let names = f.split(".");
      let alias = names
        .slice(names.length - tryNum, names.length)
        .join(" ")
        .replace(/_/g, " ");
      if (!aliases.includes(alias)) {
        aliases.push(alias);
        return alias;
      } else {
        return findFriendlyName(f, tryNum + 1);
      }
    }

    for (let field in headers) {
      cols.push({
        id: field.replace(/\$/g, "attr").replace(/[^A-Za-z0-9_]/g, "_"),
        alias: findFriendlyName(field, 1),
        dataType: headers[field]
      });
    }

    let tableSchema = {
      id: table,
      alias: tables[table].alias,
      columns: cols
    };
    tableSchemas.push(tableSchema);
    console.log("Table schema created: ", tableSchema);
  }

  schemaCallback(tableSchemas);
};

function _serverLog(log) {
  $.post("/log" , {
    log
  });
}

function _fillTable(appendRows, tableDef, rawData, initRow) {
  let tableData = _jsToTable(rawData, tableDef.fields);
  let newRows = [];
  //console.log(initRow);
  for (let row of tableData.rows) {
    let newRow = {...initRow};

    for (let prop in row) {
      if (!newRow[prop.replace(/\$/g, "attr").replace(/[^A-Za-z0-9_]/g, "_")]) {
        newRow[prop.replace(/\$/g, "attr").replace(/[^A-Za-z0-9_]/g, "_")] = row[prop];
      }
    }
    console.log(initRow);
    newRows.push(newRow);
  }

  let row_index = 0;
  let size = 10000;
  while (row_index < newRows.length) {
    _serverLog("New rows: " + newRows.length);
    appendRows(newRows.slice(row_index, size + row_index));
    row_index += size;

    let log = "Getting row: " + row_index;
    _serverLog(log);
    tableau.reportProgress(log);
  }
}

// Get the data for each table
myConnector.getData = async function(table, doneCallback) {
  console.log("Phase: getData");
  let conData = JSON.parse(tableau.connectionData);
  let dataString = conData.dataString;
  let dataUrl = conData.dataUrl;
  let tables = conData.tables;
  let method = conData.method;
  let headers = conData.headers;
  let username = tableau.username || "";
  let token = conData.token;
  let tableSchemas = [];

  // TODO
  let foldersUrl = "https://cloud.uipath.com/amgenrpa/" + dataUrl + "/orchestrator_/odata/Folders";

  let jobsUrl = "https://cloud.uipath.com/amgenrpa/" + dataUrl + "/orchestrator_/odata/Jobs";

  let licenses = [
    //"NonProduction",
    "Attended",
    "Unattended",
    //--"Studio",
    "Development", //RpaDeveloper
    //--"RpaDeveloper",
    "StudioX", //Citizen Developer
    //--"CitizenDeveloper",
    "Headless",
    //--"RpaDeveloperPro",
    "StudioPro", //Automation Developer
    //"TestAutomation",
    //"AutomationCloud",
    //"Serverless"
  ];
  let licensesUrls = licenses.map(function(x) {
    return "https://cloud.uipath.com/amgenrpa/" + dataUrl + "/odata/LicensesNamedUser/UiPath.Server.Configuration.OData.GetLicensesNamedUser(robotType='" + x + "')";
  });
 
  let totalLicensesUrl = "https://cloud.uipath.com/amgenrpa/" + dataUrl + "/odata/Settings/UiPath.Server.Configuration.OData.GetLicense";

  let currentTable = table.tableInfo.id;
  console.log("Getting data for table: " + currentTable);

  if (currentTable == "folders") {
    let foldersHeaders = {
      "Content-Type": "application/json"
    };

    await _retrieveJsonData({ dataString, dataUrl: foldersUrl, method: "GET", username, token, headers: foldersHeaders }, async function(
      foldersData2
    ) {
      _fillTable(table.appendRows, tables[currentTable], foldersData2, {value_Tenant: dataUrl});
      doneCallback();
    });
  }
  else if (currentTable == "jobs") {
    await _retrieveJsonData({ dataString, dataUrl: foldersUrl, method: "GET", username, token, headers }, async function(
      foldersData
    ) {

      let folders = foldersData["value"];
      for (const i in folders) {
        let jobsHeaders = {
          "Content-Type": "application/json",
          "X-UIPATH-OrganizationUnitId": folders[i]["Id"]
        };
        
        await _retrieveJsonData({ dataString, dataUrl: jobsUrl, method: "GET", username, token, headers: jobsHeaders }, async function(
          jobsData
        ) {

          _fillTable(table.appendRows, tables[currentTable], jobsData, {value_Tenant: dataUrl});

          if (i == (folders.length - 1)) { 
            doneCallback();
          }
        });
      }

    });
  }
  else if (currentTable == "licenses") {
    for (const i in licensesUrls) {
      let licensesHeaders = {
        "Content-Type": "application/json"
      };

      await _retrieveJsonData({ dataString, dataUrl: licensesUrls[i], method: "GET", username, token, headers: licensesHeaders }, async function(
        licensesData
      ) {
        _fillTable(table.appendRows, tables[currentTable], licensesData, { value_LicenseType: licenses[i], value_Tenant: dataUrl });
        console.log("license " + i )
        if (i == (licensesUrls.length - 1)) { 
            doneCallback();
        }
      });
    }
  }
  else if (currentTable == "totalLicenses") {
    let totalLicensesHeaders = {
      "Content-Type": "application/json"
    };

    await _retrieveJsonData({ dataString, dataUrl: totalLicensesUrl, method: "GET", username, token, headers: totalLicensesHeaders }, async function(
      totalLicensesData
    ) {
      _fillTable(table.appendRows, tables[currentTable], totalLicensesData, {Tenant: dataUrl});
      _serverLog("done?")
      doneCallback();
      _serverLog("now?")
    });
  } 
  else {
    console.log("Unknown table: " + currentTable);
    _error("Unknown table: " + currentTable);
  }
  //  doneCallback();
};

tableau.connectionName = "JSON/XML Data";
tableau.registerConnector(myConnector);
window._tableau.triggerInitialization &&
  window._tableau.triggerInitialization(); // Make sure WDC is initialized properly

async function _getToken(secret) {
  var url = "https://cloud.uipath.com/identity_/connect/token";

  var headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  };

  var data = {
    "grant_type": "client_credentials",
    "client_id": "073481db-7be1-4ee7-be28-cf529ad3285a",
    "client_secret": secret,
    "scope": "OR.Folders.Read OR.Jobs.Read OR.License.Read OR.Administration.Read OR.Analytics.Read OR.Assets.Read OR.Audit.Read OR.BackgroundTasks.Read OR.Execution.Read OR.Hypervisor.Read OR.Machines.Read OR.Monitoring.Read OR.Queues.Read OR.Robots.Read OR.Settings.Read OR.Tasks.Read OR.Users.Read"
  };

  var method = "POST";

  let result = await $.post("/proxy/" + url, {
    method,
    headers,
    data
  });

  var accessToken = JSON.parse(result.body)["access_token"];

  return accessToken;
}

// Gets data from URL or string. Inputs are all strings. Always returns JSON data, even if XML input.
async function _retrieveJsonData(
  { dataString, dataUrl, method, username, token, headers },
  retrieveDataCallback
) {
  console.log("Starting _retrieveJsonData")
  let rawData = dataString;
  if (!cachedTableData || true) {
    if (dataUrl) {
      let result = await $.post("/proxy/" + dataUrl, {
        method,
        username,
        token,
        headers
      });

      if (result.error) {
        console.error(result.error+"...");
        if (tableau.phase !== "interactive") {
          console.error(result.error);
          tableau.abortWithError(result.error);
        } else {
          _error(result.error);
        }
        return;
      }
      rawData =
        result.body.charCodeAt(0) === 65279
          ? result.body.slice(1)
          : result.body; // Remove BOM character if present
    }
  } else {
    retrieveDataCallback(cachedTableData);
    return;
  }
  const successCallback = function(data) {
    try {
      cachedTableData = JSON.parse(data);
    } catch (err) {
      _error("Error parsing JSON");
    }
    retrieveDataCallback(cachedTableData);
  };

  if (typeof rawData === "string" && rawData.trim().startsWith("<")) {
    xml2js.parseString(rawData, function(err, result) {
      successCallback(JSON.stringify(result));
      if (err) _error(err);
    });
    return;
  }
  successCallback(rawData);
}

// Turns tabular data into json for Tableau input
function _csv2table(csv) {
  let lines = Papa.parse(csv, {
    delimiter: ",",
    newline: "\n",
    dynamicTyping: true
  }).data;
  let fields = lines.shift();
  let headers = {};
  let rows = [];

  for (let field of fields) headers[field] = {};

  for (let line of lines) {
    var obj = {};
    for (let field in fields) {
      let header = headers[fields[field]];
      let value = line[field];

      if (
        value === "" ||
        value === '""' ||
        value === "null" ||
        value === null
      ) {
        obj[fields[field]] = null;
        header.null = header.null ? header.null + 1 : 1;
      } else if (value === "true" || value === true) {
        obj[fields[field]] = true;
        header.bool = header.bool ? header.bool + 1 : 1;
      } else if (value === "false" || value === false) {
        obj[fields[field]] = false;
        header.bool = header.bool ? header.bool + 1 : 1;
      } else if (typeof value === "object") {
        obj[fields[field]] = value.toISOString();
        header.string = header.string ? header.string + 1 : 1;
      } else if (!isNaN(value)) {
        obj[fields[field]] = value;
        if (parseInt(value) == value) {
          header.int = header.int ? header.int + 1 : 1;
        } else {
          header.float = header.float ? header.float + 1 : 1;
        }
      } else {
        obj[fields[field]] = value;
        header.string = header.string ? header.string + 1 : 1;
      }
    }
    rows.push(obj);
  }

  for (let field in headers) {
    // strings
    if (headers[field].string) {
      headers[field] = "string";
      continue;
    }
    // nulls
    if (Object.keys(headers[field]).length === 1 && headers[field].null) {
      headers[field] = "string";
      continue;
    }
    // floats
    if (headers[field].float) {
      headers[field] = "float";
      continue;
    }
    // integers
    if (headers[field].int) {
      headers[field] = "int";
      continue;
    }
    // booleans
    if (headers[field].bool) {
      headers[field] = "bool";
      continue;
    }
    headers[field] = "string";
  }

  return { headers, rows };
}

// Flattens out the JSON data to a  tabular format
function _jsToTable(data, fields) {
  let paths = new Set();
  for (let field of fields) {
    let levels = field.split(".");
    for (let level in levels) {
      paths.add(levels.slice(0, +level + 1).join("."));
    }
  }
  paths = Array.from(paths);
  const json2csvParser = new json2csv.Parser({
    fields,
    transforms: [json2csv.transforms.unwind({ paths })]
  });
  const csvData = json2csvParser.parse(data);
  return _csv2table(csvData);
}

// Grabs all the possible paths for properties in an object
function _objectToPaths(data) {
  let result = new Set();
  getPath(data, "");
  let paths = Array.from(result);
  return paths;

  function getPath(data, path) {
    if (data && typeof data === "object") {
      if (Array.isArray(data)) {
        for (let i in data) {
          getPath(data[i], path);
        }
      } else {
        for (let p in data) {
          getPath(data[p], path + p + ".");
        }
      }
    } else {
      path = path.split("");
      path.pop();
      result.add(path.join(""));
    }
  }
}

// Turns an array of object path names into an object for display
function _pathsToTree(paths) {
  let result = {};
  function makeTree(path, level) {
    let levels = path.split(".");
    let currentLevel = levels.slice(level, level + 1);

    if (level === 0) {
      if (!result[currentLevel]) result[currentLevel] = {};
    } else {
      let cur = result[levels[0]];
      for (let c of levels.slice(1, level + 1)) {
        if (cur[c]) {
          cur = cur[c];
        } else {
          cur[c] = {};
        }
      }
    }
    if (level + 1 < levels.length) {
      makeTree(path, level + 1);
    }
  }
  for (let path of paths) {
    makeTree(path, 0);
  }
  return result;
}

function _addTable(tableName) {
  let tableID = 0; // Scan highest table id number then +1
  $("input[data-tableid]").each(function() {
    tableID =
      $(this).data("tableid") > tableID ? $(this).data("tableid") : tableID;
  });
  tableID++;

  let tableTemplate = `
    <div class="table" data-tableid="${tableID}">
      <p class="label">Table Name</p>
      <div class="row">
        <input data-tableid="${tableID}" type="text" value="${tableName}"/>
        <button class="delete" data-tableid="${tableID}" onclick="_deleteTable(this)">Delete</button>
      </div>
      <div class="selections">
        <span><a onclick="_selectAll(this)" data-tableid="${tableID}">Select All</a></span>
        <span><a onclick="_clearAll(this)" data-tableid="${tableID}">Clear All</a></span>
      </div>
      <div class="fields" data-tableid="${tableID}">No data fields found</div>
    </div>
  `;

  $("#tables").append(tableTemplate);
  _askForFields(tableID);
}

function _deleteTable(e) {
  let tableID = $(e).data("tableid");
  let table = $(".table[data-tableid=" + tableID + "]");
  table.remove();
}

// Switches to field input form and displays potential fields
async function _askForFields(tableID, rawData) {
  let conData = JSON.parse(tableau.connectionData);
  let dataString = conData.dataString;
  let dataUrl = conData.dataUrl;
  let method = conData.method;
  let headers = conData.headers;
  let username = tableau.username || "";
  let token = conData.token;

  let div = $(".fields[data-tableid=" + tableID + "]");
  let fieldsTree;

  fieldsTree = _pathsToTree(_objectToPaths(rawData));

  if (!fieldsTree) return;

  let output = "";

  function displayFields(fields, spacing, parent) {
    for (let field in fields) {
      let showCheck = Object.keys(fields[field]).length === 0;
      output += `<div class='field' onclick='${
        showCheck ? "_toggleCheck(this)" : "_toggleChildCheck(this)"
      }' data-checked='false' style="padding-left:${spacing}px;" data-tableid='${tableID}' data-visible='${showCheck}' data-field='${(parent ===
      ""
        ? ""
        : parent + ".") + field}'>
        ${
          showCheck
            ? '<div class="check"></div>'
            : '<div class="check nested"></div>'
        }
        <div class="fieldText" >
          ${field}
        </div>
      </div>`;
      if (fields[field]) {
        displayFields(
          fields[field],
          spacing + 10,
          (parent === "" ? "" : parent + ".") + field
        );
      }
    }
  }

  displayFields(fieldsTree, 0, "");

  div.html(output);
  $("#dataInput").css("display", "none");
  $("#fieldInput").css("display", "block");
}

// Checks if JSON is parseable
function _checkJSONFormat(input) {
  input = input.trim();
  if (!input.startsWith("<")) {
    let dataJSON;
    try {
      dataJSON = JSON.parse(input);
    } catch (e) {
      dataJSON = JSON.parse(JSON.stringify(eval("(" + input + ")")));
    }
    return JSON.stringify(dataJSON);
  }
  return input;
}

// Grabs wanted fields and submits data to Tableau
function _submitDataToTableau() {
  let tables = {};

  // Make sure no duplicate table names
  $(".table").each(function() {
    let tableName = (
      $(this)
        .find("input[data-tableid]")
        .val() || "My Data"
    ).trim();
    let tableID = $(this)
      .find("input[data-tableid]")
      .data("tableid");
    let tableTableauID = tableName.replace(/[^A-Za-z0-9_]/g, "_");
    function createUniqueID(tableTableauID, tryNum) {
      let tryText = tryNum ? "_" + (tryNum + 1) : "";
      tables.hasOwnProperty(tableTableauID + tryText)
        ? createUniqueID(tableTableauID, tryNum + 1)
        : (tables[tableTableauID + tryText] = {
            id: tableID,
            alias: tableName + tryText
          });
    }
    createUniqueID(tableTableauID, null);
  });

  for (let table in tables) {
    let fields = [];
    $(".field[data-tableid=" + tables[table].id + "]").each(function() {
      if ($(this).data("visible") && $(this).data("checked") === "true") {
        fields.push($(this).data("field"));
      }
    });
    tables[table]["fields"] = fields;
  }

  let fieldCount = 0;
  for (let table in tables) {
    tables[table].fields.length === 0 ? delete tables[table] : fieldCount++;
  }

  if (fieldCount > 0) {
    let conData = JSON.parse(tableau.connectionData);
    conData = { ...conData, tables };
    tableau.connectionData = JSON.stringify(conData);
    tableau.submit();
  } else {
    _error("No fields selected.");
  }
}

function _submitAuth() {
  tableau.password = $("#password").val();
  tableau.submit();
}

function toggleAdvanced() {
  $("#advanced").toggleClass("hidden");
}

// Toggles checkedness of field
function _toggleCheck(e) {
  let checked = $(e).data("checked") === "true";
  $(e).data("checked", checked ? "false" : "true");
  $(e)
    .find(".check")
    .toggleClass("checked");
}

// Toggles checkedness for all fields under a parent
function _toggleChildCheck(e) {
  let parentTableID = $(e).data("tableid");
  let parentField = $(e).data("field");
  let children = $("#tables").find(
    `[data-tableID='${parentTableID}'][data-field^='${parentField}'][data-field!='${parentField}']`
  );
  let childCount = children.length;
  let checkedCount = children.filter(function(i) {
    return $(this).data("checked") === "true";
  }).length;

  children.each(function() {
    if (childCount === checkedCount) {
      $(this).data("checked", "false");
      $(this)
        .find(".check")
        .removeClass("checked");
    } else {
      $(this).data("checked", "true");
      $(this)
        .find(".check")
        .addClass("checked");
    }
  });
}

// Selects all fields
function _selectAll(e) {
  let tableID = $(e).data("tableid");
  $(".field[data-tableid=" + tableID + "]").each(function() {
    $(this).data("checked", "true");
    $(this)
      .find(".check")
      .addClass("checked");
  });
}

// Clears all checked fields
function _clearAll(e) {
  let tableID = $(e).data("tableid");
  $(".field[data-tableid=" + tableID + "]").each(function() {
    $(this).data("checked", "false");
    $(this)
      .find(".check")
      .removeClass("checked");
  });
}

function _addHeader() {
  let headerID = 0;
  $("div[data-headerid]").each(function() {
    headerID =
      $(this).data("headerid") > headerID ? $(this).data("headerid") : headerID;
  });
  headerID++;

  let headerTemplate = `
    <div class="row" data-headerid="${headerID}">
      <div class="advancedInput">
        <p class="label small">Name</p>
        <input class="header-name" type="text" />
      </div>
      <div class="advancedInput">
        <p class="label small">Value</p>
        <input class="header-value" type="text" />
      </div>
      <div>
        <button class="primary" onclick="_removeHeader(${headerID})">-</button>
      </div>
    </div>
  `;

  $("div#headers").append(headerTemplate);
}

function _removeHeader(headerIndex) {
  $(`div[data-headerid=${headerIndex}]`).remove();
}

// Takes data, does basic vaildation and goes to field selection phase
function _next(dataString) {
  dataString = "";
  let dataUrl = $("#url")
    .val()
    .trim();
  let method = $("#method").val();
  let token = $("#token").val();
  let username = $("#username").val();
  let password = tableau.password || $("#password").val();

  let headers = { };
  $("#headers .row").each(function() {
      headerName = $(this).find(".header-name").val().trim();
      headerValue = $(this).find(".header-value").val().trim();
      if (headerName && headerValue) {
        headers[headerName] = headerValue;
      }
  });

  if (!dataString && !dataUrl) return _error("No data entered.");

  if (dataString) {
    if (!dataString.startsWith("<")) {
      try {
        JSON.parse(_checkJSONFormat(dataString));
      } catch (e) {
        return _error("Data entered is not valid JSON.");
      }
    }

    if (dataString.startsWith("<")) {
      try {
        let xmlDoc = $.parseXML(dataString);
      } catch (err) {
        return _error("Data entered is not valid XML.");
      }
    }
  }

  if (dataString) dataString = _checkJSONFormat(dataString);
  tableau.connectionData = JSON.stringify({ dataString, dataUrl, method, headers });
  tableau.username = username;
  tableau.password = password;

  let jobsData = {
    "value": [
      {
        "Key": "9a514234-32dc-4457-ba03-598a0af3ea42",
        "StartTime": "2021-10-01T00:07:45.85Z",
        "EndTime": "2021-10-01T00:07:53.583Z",
        "State": "Successful",
        "JobPriority": "Normal",
        "SpecificPriorityValue": null,
        "Source": "Agent",
        "SourceType": "Agent",
        "BatchExecutionKey": "9a514234-32dc-4457-ba03-598a0af3ea42",
        "Info": "Job completed",
        "CreationTime": "2021-10-01T00:07:45.85Z",
        "StartingScheduleId": null,
        "ReleaseName": "001_GLOBAL_SimpleTest",
        "Type": "Attended",
        "InputArguments": "",
        "OutputArguments": "{}",
        "HostMachineName": "USTA445900",
        "HasMediaRecorded": false,
        "PersistenceId": null,
        "ResumeVersion": null,
        "StopStrategy": null,
        "RuntimeType": "Development",
        "RequiresUserInteraction": true,
        "ReleaseVersionId": 159471,
        "EntryPointPath": null,
        "OrganizationUnitId": 616397,
        "OrganizationUnitFullyQualifiedName": "Research and Development/001_GLOBAL_SimpleTest",
        "Reference": "",
        "ProcessType": "Process",
        "ProfilingOptions": null,
        "ResumeOnSameContext": false,
        "LocalSystemAccount": "autogen\\snakka02@amgen.com_local",
        "OrchestratorUserIdentity": null,
        "Id": 10325449,
        "Tenant": null
      }
    ]
  };

  let licensesData = {
    "value": [
      {
        "Key": "am\\agunaydi",
        "UserName": "am\\agunaydi",
        "LastLoginDate": "2022-02-22T10:51:26.127Z",
        "MachinesCount": 1,
        "IsLicensed": false,
        "IsExternalLicensed": false,
        "ActiveRobotId": null,
        "LicenseType": null,
        "Tenant": null
      }
    ]
  };

  let foldersData = {
    "value": [
      {
        "Key": "b3996f91-67e6-4a27-8522-63281333ff06",
        "DisplayName": "Shared",
        "FullyQualifiedName": "Shared",
        "FullyQualifiedNameOrderable": "Shared",
        "Description": null,
        "ProvisionType": "Automatic",
        "PermissionModel": "FineGrained",
        "ParentId": null,
        "ParentKey": null,
        "IsActive": true,
        "FeedType": "Processes",
        "Id": 342038,
        "Tenant": null
      }
    ]
  };

  let totalLicensesData = {
    "ExpireDate": 1654041599,
    "Allowed": {
        "Headless": 0,
        "StudioX": 300,
        "Attended": 0,
        "Unattended": 0,
        "NonProduction": 0,
        "Development": 0,
        "StudioPro": 2,
        "TestAutomation": 0,
        "AutomationCloud": 0
    },
    "Used": {
        "Headless": 0,
        "StudioX": 118,
        "Attended": 1,
        "Unattended": 0,
        "NonProduction": 0,
        "Development": 0,
        "StudioPro": 3,
        "TestAutomation": 0,
        "AutomationCloud": 0
    },
    "Tenant": null
  };

  _addTable("folders");
  _askForFields(1, foldersData);

  _addTable("jobs");
  _askForFields(2, jobsData);

  _addTable("licenses");
  _askForFields(3, licensesData);

  _addTable("totalLicenses");
  _askForFields(4, totalLicensesData);
}

// Shows error message below submit button
function _error(message) {
  $(".error")
    .fadeIn("fast")
    .delay(3000)
    .fadeOut("slow");
  $(".error").html(message);
  $("html, body").animate({ scrollTop: $(document).height() }, "fast");
}

// All of the below handles draging and dropping files
function cancel(e) {
  e.stopPropagation();
  e.preventDefault();
}

$(document)
  .on("dragenter", cancel)
  .on("drop", cancel)
  .on("dragover", function(e) {
    cancel(e);
    $("#dragdrop").css("border", "2px dashed #FE6568");
  })
  .on("dragleave", function(e) {
    cancel(e);
    $("#dragdrop").css("border", "2px dashed #CCC");
  });

$("#dragdrop")
  .on("dragenter", cancel)
  .on("dragover", function(e) {
    cancel(e);
    $(this).css("border", "2px solid #FE6568");
    $(this).css("background-color", "#FFCECF");
  })
  .on("dragleave", function(e) {
    cancel(e);
    $(this).css("border", "2px dashed #CCC");
    $(this).css("background-color", "#FFFFFF");
  })
  .on("drop", function(e) {
    cancel(e);
    $(this).css("border", "2px dashed #CCC");
    $(this).css("background-color", "#FFFFFF");
    try {
      let files = e.originalEvent.dataTransfer.files;
      let file = files[0];
      let reader = new FileReader();
      reader.onload = function(e) {
        _next(reader.result);
      };
      reader.readAsText(file);
    } catch (err) {
      _error("Could not read file.");
      console.log(err);
    }
  });
