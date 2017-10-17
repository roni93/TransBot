console.log(document.URL);
var express = require('express');
var app = express();
app.get('/', function(req, res){
    console.log(req);
    res.send('hello world');

});