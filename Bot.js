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
const RESPONSE_MODE = "waitForTrans";

const tgBot = new tgFancyBot('375437667:AAHzCxvO7LZnHPb6YNQTZVgrgLbjq5Ly0JE', {polling: true});

let registeredUsers = {};

setInterval(cleaRegistered, DELAY); //clears the registered users

function processTgMessage(tgMsg) {
    setTimeout(TimeOut, CLEAR_SESSION);
    let user = getUser(tgMsg);

    if (user.state === LANG_MODE) {
        setLanguage(tgMsg, user);
    }
    if (user.state === TRANS_MODE) {
        trans(user, tgMsg);
    }
    if (user.state === RESPONSE_MODE) {
        user.state = TRANS_MODE;
        publishTrans(user, tgMsg);

    }

}


function publishTrans(user, tgMsg) {

    const text = tgMsg.text;
    const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    console.log(text);

    // TODO: Now it logs in every single time.
    // It really should try to reuse the login sessions.
    mediaWikiAPI.login("RoniTransBot", "12345678", () => {
        // mediaWikiAPI.addTranslation(
        //
        //     targetMwMessage.title, text,
        //     "Made with Telegram Bot",
        //     () => {
        //        // storePublishingTgMessage(tgMsg, targetMwMessage);
        //     }
        // );
        user.publishingTgMessages[targetMwMessage]=text;
        user.currentMwMessageIndex++;
    });
}

tgBot.on("callback_query", (tgMsg) => {
    setTimeout(TimeOut, CLEAR_SESSION);
    let user = registeredUsers[tgMsg.from.id];
    if (tgMsg.data === "help") {
        helpFunction(tgMsg);
    }
    if (user.state === START_MODE) {
        user.state = LANG_MODE;
        tgBot.sendMessage(user.id, "Please type your language:");
    }
    if (user.state === LANG_SELECTED_MODE) {
        langSelected(user, tgMsg, true);
    }
    if (user.state === TRANS_MODE && tgMsg.data === "start-trans") {
        trans(user, tgMsg)
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "doc") {
       showDocumentation(user);
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "skip") {
        skipMsg(user,tgMsg);
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "similar") {
        showAndCacheSimilar(user);
    }
});

function skipMsg(user, tgMsg) {
    user.skippedMrddages.push(user.loadedMwMessages[user.currentMwMessageIndex]);
    user.currentMwMessageIndex++;
    trans(user,tgMsg);

}

function  showDocumentation(user) {
    const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    const title = targetMwMessage.title;
    mediaWikiAPI.getDocumentation(title, (documentation) => {
        tgBot.sendMessage(
            user.id,
            documentation
        );
    });
}

function breakPoint(tgMsg, user, flag) {
    if (!flag) {
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
    else {
        let options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Start Translate', callback_data: 'start-trans'}]
                ]
            })
        };
        tgBot.sendMessage(user.id, "Please press 'Start Translate'", options);
    }
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
            user.fullLang = arg.languagesearch;

            if (Object.keys(arg.languagesearch).length === 1) {
                user.state = LANG_SELECTED_MODE;
                user.lang = Object.keys(arg.languagesearch)[0];
                langSelected(user, tgMsg, false);
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
        fullLang: "",
        state: START_MODE,
        currentMwMessageIndex: 0,
        skippedMrddages: [],
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
            inline_keyboard: [[{text: 'Set language', callback_data: 'change-language'}]]
        })
    };
    tgBot.sendMessage(user.id, "What would you like to do?", options);
}

function showUnTrans(user, tgMsg) {
    let targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    if (targetMwMessage === undefined) {
        breakPoint(tgMsg, user, false);
        // TODO: Show the welcome menu instead
        return;
    }

    mediaWikiAPI.getTranslationMemory(targetMwMessage.title, (translationMemory) => {
        targetMwMessage.translationMemory = translationMemory;

        if (targetMwMessage.translationMemory.length === 0) {
            console.log(user.id, `No translation memory was found for "${targetMwMessage.title}"`
            );
        }
        const inlineKeyboard = [];


        inlineKeyboard.push([{text: "Documentation", callback_data: "doc"}, {
            text: "Skip message",
            callback_data: "skip"
        }, {text: "Similar message", callback_data: "similar"}]);
        const tgMsgOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: inlineKeyboard
            })
        };

        tgBot.sendMessage(
            user.id,
            targetMwMessage.definition,
            tgMsgOptions
        );
        if (targetMwMessage.translation !== null) {
            tgBot.sendMessage(user.id, "Current translation: " + targetMwMessage.translation);
        }
        user.state = RESPONSE_MODE;
    });
}

function trans(user, tgMsg) {
    if (user.currentMwMessageIndex === 10 || user.loadedMwMessages.length === 0){
        loadUntranslated(user, (loadedMwMessages) => {

            user.loadedMwMessages = loadedMwMessages;
            showUnTrans(user, tgMsg);
        });
    console.log("load")}
    else {
        showUnTrans(user, tgMsg);
    }
}

function loadUntranslated(user, cb) {
    user.loadedMwMessages = [];
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



function langSelected(user, tgMsg, flag) {

    if (flag)
        user.lang = tgMsg.data;
    tgBot.sendMessage(user.id, "Your language set to " + user.fullLang[user.lang]);
    user.state = TRANS_MODE;
    breakPoint(tgMsg, user, false);
}

function showAndCacheSimilar(user) {
    const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    const title = targetMwMessage.title;

    if (user.loadedTranslationMemory[targetMwMessage.title] !== undefined) {
        const ttmCache = user.loadedTranslationMemory[targetMwMessage.title];
        for (i = 0; i < ttmCache.length; i++) {
            tgBot.sendMessage(user.id, ttmCache[i]);
        }
    }
    else {
        mediaWikiAPI.getTranslationMemory(title, (translationMemory) => {
            let i;
            if (translationMemory.length === 0) {
                tgBot.sendMessage(user.id, `No translation memory was found for "${title}"`);
                return;
            }

            for (i = 0; i < translationMemory.length; i++) {
                cacheTranslationMemory(user, targetMwMessage, i, translationMemory[i].target);
            }

            const ttmCache = user.loadedTranslationMemory[targetMwMessage.title];
            for (i = 0; i < ttmCache.length; i++) {
                tgBot.sendMessage(user.id, ttmCache[i]);
            }
        });
    }
}

function cacheTranslationMemory(user, targetMwMessage, i, text) {
    const title = targetMwMessage.title;

    if (user.loadedTranslationMemory[title] === undefined) {
        user.loadedTranslationMemory[title] = [];
    }
    user.loadedTranslationMemory[title][i] = text;
}

tgBot.onText(/.*/, processTgMessage);
tgBot.onText(/help/, helpFunction);


function helpFunction(tgMsg) {
    let user = registeredUsers[tgMsg.from.id];
    tgBot.sendMessage(user.id, "HELP!!!");
    breakPoint(tgMsg, user, true);
}

function TimeOut() {
    //exit
}

function cleaRegistered() {
    registeredUsers = {};
}
