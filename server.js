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

app.listen(4000);

console.log("Running");

//require('./router');