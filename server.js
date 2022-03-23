///////////////////////////////////////////////////////////////////////
// JSON & XML Web Data Connector																		 //
// A Tableau Web Data Connector for connecting to XML and JSON data. //
// Author: Keshia Rose                                               //
// GitHub: https://github.com/KeshiaRose/JSON-XML-WDC                //
// Version 1.1                                                       //
///////////////////////////////////////////////////////////////////////

const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/log", async (req, res) => {
  console.log('[' + new Date() + '] ' + req.body.log);
  res.send({});
});

app.post("/proxy/*", async (req, res) => {
  const url = req.url.split("/proxy/")[1];
  console.log('[' + new Date() + '] Executing request: URL=' + url + " ; method=" + req.body.method);

  let options = {
    method: req.body.method
  };

  options["headers"] = req.body.headers || { };
  if (req.body.username) {
    let buff = Buffer.from(req.body.username+":"+req.body.token);
    let base64data = buff.toString('base64');

    options["headers"]["Authorization"] = `Basic ${base64data}`;
  } else if (req.body.token) {
    options["headers"]["Authorization"] = `Bearer ${req.body.token}`;
  }

  if (req.body.data) {
    options["body"] = new URLSearchParams(req.body.data);
  }
  
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      console.log('[' + new Date() + '] Executing request: URL=' + url + " ; method=" + req.body.method + " OK!");
      const body = await response.text();
      res.send({ body });
    } else {
      console.log('Response not ok: ' + response.statusText);
      res.send({ error: response.statusText });
    }
  } catch (error) {
    console.log('Error: ' + error.message);
    res.send({ error: error.message });
  }
});

const listener = app.listen(PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
