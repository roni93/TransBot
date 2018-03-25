const fs = require('fs');
const convertLang = {'he-IL': ['he', 'עברית'], "iw-IL": ['he', 'עברית'], 'en': ['en', 'English']};

exports.findLang = function (string) {
    if (convertLang[string] !== undefined) {
        return convertLang[string];
    }
    else
        return false;
};

exports.addNewLang = function (tgMsgLang, userLangChoose) {
    if (tgMsgLang.data === undefined) {
        tgMsgLang.data = tgMsgLang.text
    }
    const convert = tgMsgLang.from.language_code + ": " + userLangChoose;
    fs.appendFile("./logs/languages.txt", convert + "\r\n", function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
};