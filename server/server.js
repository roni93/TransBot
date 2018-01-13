var express = require('express');

var app = express();
var port = parseInt(process.env.PORT, 10);

app.use('/translate-bot/auth', function (req, res) {
    var verifier = req.query.oauth_verifier;
    var token = req.query.oauth_token;
    if (verifier !== undefined && token !== undefined)
        res.redirect('https://telegram.me/ronitranslatebot?start=verifier' + verifier + 'token' + token);
    res.send("Something wen't wrong. Please try again.");
});

app.listen(port);
