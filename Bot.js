//-----------CONST-------------//
const DELAY = 3600000;
const CLEAR_SESSION = 300000;

const mediaWikiAPI = require("./MediaWikiAPI.js");
const tgFancyBot = require("tgfancy");
//const sqlite3 = require("sqlite3").verbose();
//const db = new sqlite3.Database("db/telegram-bot.db");

const START_MODE = "start";
const LANG_MODE = "language";
const LANG_SELECTED_MODE = "langSelected";
const TRANS_MODE = "translate";

const tgBot = new tgFancyBot('375437667:AAHzCxvO7LZnHPb6YNQTZVgrgLbjq5Ly0JE', {polling: true});

var registeredUsers = {};

setInterval(cleaRegistered, DELAY); //clears the registered users

function processTgMessage(tgMsg) {
    setTimeout(TimeOut, CLEAR_SESSION);
    let user = getUser(tgMsg);

    if (user.state === LANG_MODE) {
        setLanguage(tgMsg, user);
    }
    if (user.state === TRANS_MODE) {
        trans(user,tgMsg);
    }

}

function breakPoint(tgMsg,user){
    let options = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Start Translate', callback_data: 'start-trans'}],
                [{text: 'Help', callback_data: 'help'}]
            ]
        })
    };
    tgBot.sendMessage(user.id, "for help in any moment please type '/help', or press now", options);
}

function setLanguage(tgMsg, user) {
    let text = tgMsg.text;
    let checkLang = function (text, callback) {
        mediaWikiAPI.languageSearch(text, function (arg) {
            callback(arg);
        });
    };
    checkLang(text, function (arg) {
        let setLang = JSON.parse(JSON.stringify(arg.languagesearch));
        if (arg.languagesearch === []) {
        }
        else {
            const inlineKeyboard = [];
            for (let key in setLang)
                inlineKeyboard.push([{text: setLang[key], callback_data: key}]);

            const tgMsgOptions = {
                reply_markup: JSON.stringify({
                    inline_keyboard: inlineKeyboard
                })
            };
            user.state = LANG_SELECTED_MODE;
            tgBot.sendMessage(user.id, "please select your language:", tgMsgOptions);

        }
    })
}


// Returns true if the parameter contains
// a string that can be sent to Telegram.
function validTgMessage(tgMsg) {
    return (typeof tgMsg === "string") &&
        // Telegram messages cannot be empty strings
        (tgMsg !== "") &&
        // The Telegram length hard limit is 4096
        (tgMsg.length < 4096);
}



function getUser(tgMsg) {
    let user = registeredUsers[tgMsg.from.id];
    if (user === undefined) {
        user = initUser(tgMsg);
        tgBot.sendMessage(user.id, "Welcome " + user.firstName + "!");
        newUser(user);
    }
    return user;
}

function initUser(tgMsg) {
    return {
        id: tgMsg.from.id,
        firstName: tgMsg.from.first_name,
        lang: tgMsg.from.language_code,
        state: START_MODE,
        currentMwMessageIndex: 0,
        loadedMwMessages: [],
        loadedTranslationMemory: {},
        publishingTgMessages: {},
    };
}

//register the user into to db if needed
function newUser(user) {
    registeredUsers[user.id] = user;

    var options = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Set language', callback_data: 'change-language'}]
            ]
        })
    };
    tgBot.sendMessage(user.id, "What would you like to do?", options);
}

function trans(user, tgMsg) {
    if(user.currentMwMessageIndex === 10 || user.loadedMwMessages.length ===0)
        loadUntranslated(user, (loadedMwMessages)=>{
            console.log(loadedMwMessages);
            user.loadedMwMessages=loadedMwMessages;
        });

    //console.log(user.loadedMwMessages);

    console.log(user.loadedMwMessages[user.currentMwMessageIndex]);

    //tgBot.sendMessage(user.id, user.loadedMwMessages[user.currentMwMessageIndex]);

}

function loadUntranslated(user,cb) {
        user.loadedMwMessages=[];
        mediaWikiAPI.getUntranslatedMessages(user.lang, (mwMessageCollection) => {
        user.loadedMwMessages = mwMessageCollection.filter((mwMessageData) => {
            return validTgMessage(mwMessageData.definition);
        });
        user.currentMwMessageIndex = 0;
        if (user.loadedMwMessages.length) {
            cb(user.loadedMwMessages)
        } else
            tgBot.sendMessage(user.id, "Nothing to translate!");

    });
}

tgBot.on("callback_query", (tgMsg) => {
    let user = registeredUsers[tgMsg.from.id];
    if (user.state === START_MODE) {
        user.state = LANG_MODE;
        tgBot.sendMessage(user.id, "Please type your language:");
    }
    if (user.state === LANG_SELECTED_MODE) {
        user.lang = tgMsg.data;
        tgBot.sendMessage(user.id, "Your language set to " + user.lang);
        user.state = TRANS_MODE;

        breakPoint(tgMsg,user);
    }
    if(user.state === TRANS_MODE && tgMsg.data === "start-trans"){
        trans(user,tgMsg)
    }

});


tgBot.onText(/.*/, processTgMessage);
tgBot.onText(/help/, helpFunction);


function helpFunction(tgMsg) {
     let user = registeredUsers[tgMsg.from.id];
     tgBot.sendMessage(user.id, "HELP!!!");
     breakPoint(tgMsg,user);
 }

function TimeOut() {
    //exit
}

function cleaRegistered() {
    registeredUsers = {};
}
