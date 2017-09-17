//-----------CONST-------------//
const DELAY=3600000;
const CLEAR_SESSION=300000;

const mediaWikiAPI = require("./MediaWikiAPI.js");
const tgFancyBot = require("tgfancy");
//const sqlite3 = require("sqlite3").verbose();
//const db = new sqlite3.Database("db/telegram-bot.db");

const tgBot = new tgFancyBot('375437667:AAHzCxvO7LZnHPb6YNQTZVgrgLbjq5Ly0JE',{ polling: true });

var registeredUsers = {};

setInterval(cleaRegistered, DELAY); //clears the registered users

function startSession(msg) {
    console.log(msg);
    setTimeout(TimeOut, CLEAR_SESSION);
    const user = {id:msg.from.id, firstName: msg.from.first_name, lang:msg.from.language_code};
    tgBot.sendMessage(user.id, "Welcome "+user.firstName+"!");

    if(registeredUsers[user.id] === undefined) {
        newUser(user);
        trans(user,msg);
    }
    else
        trans(user,msg)
}


function newUser(user) {
    registeredUsers[user.id] = user;
    console.log(registeredUsers[user.id])
}
function trans(user,msg) {

    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: 'Start Translating', callback_data: "start-trans"}],
                [{ text: 'Change language', callback_data: 'change-language' }]
            ]
        })
    };
    tgBot.sendMessage(user.id, "What would you like to do?", options).then(function (sended) {


    });

}

tgBot.on("callback_query", (tgMsg) => {
    console.log("pressed button");


    console.log("callback_query got tgMsg:");
    console.log(tgMsg);

    // const callbackData = JSON.parse(tgMsg.data);

    console.log("Parsed callback data:");
    // console.log(callbackData);
    if (tgMsg.data === "change-language") {
        mediaWikiAPI.languageSearch(tgMsg.text);
    }

//callbackFunctions[callbackActions[callbackData.action]].call(null, tgMsg);

});


tgBot.onText(/.*/,startSession);
function t() {
    console.log("fdfd");

}
//const targetMwMessage = getCurrentMwMessage(userID);


function TimeOut() {
    //exit
}
function cleaRegistered() {
    registeredUsers={};
}

