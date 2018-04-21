var express = require("express");
//var clm = require("clmtrackr");
var app     = express();
app.use(express.static(__dirname + '/videochat'));
//Store all HTML files in view folder.
app.use(express.static(__dirname + '/includes'));
//Store all JS and CSS in Scripts folder.

app.get('/',function(req,res){
  res.sendFile('index.html');
  //It will find and locate index.html from View or Scripts
});

app.listen(8080);

console.log("Running at Port 8080");

//require('./router');