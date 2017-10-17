

const fs = require('fs');
let convertLang = {'he-IL':['he','עברית'], "iw-IL":['he','עברית']};
//let convertLang = { };


exports.findLang = function (string) {
    if(convertLang[string] !== undefined){
        return convertLang[string];
    }
    else
        return false;

};

exports.addNewLang = function (tgMsgLang, userLangChoose) {
    const convert=tgMsgLang +": " +userLangChoose+"\n";

    fs.writeFile("./logs/languages", convert, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
};