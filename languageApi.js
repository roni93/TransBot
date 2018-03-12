const fs = require('fs');
let convertLang = {'he-IL':['he','עברית'], "iw-IL":['he','עברית'], 'en':['en','English']};

exports.findLang = function (string) {
    if (convertLang[string] !== undefined) {
        return convertLang[string];
    }
    else
        return false;
};

exports.addNewLang = function (tgMsgLang, userLangChoose) {
    console.log(tgMsgLang)

    if (tgMsgLang.data === undefined){
        tgMsgLang.data = tgMsgLang.text
    }
    const convert = userLangChoose + ": " + tgMsgLang.data + "\n";

    fs.writeFile("./logs/languages", convert, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
};