//-----------CONST-------------//
"use strict";

const DELAY = 3600000;
const CLEAR_SESSION = 300000;

const mediaWikiAPI = require("./MediaWikiAPI.js");
const langApi = require("./languageApi");
const OauthApi = require("./Oauth.js");
const tgFancyBot = require("tgfancy");

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("db/telegram-bot.db");


const START_MODE = "start";
const LANG_MODE = "language";
const LANG_SELECTED_MODE = "langSelected";
const RESPONSE_MODE = "waitForTranslation";
const READY_MODE = "readyToTrans";
const VERIFIER_MODE = "waitForVerifier";
const TOKEN_MODE = "waitForToken";

const tgBot = new tgFancyBot('375437667:AAHzCxvO7LZnHPb6YNQTZVgrgLbjq5Ly0JE', {polling: true});

let registeredUsers = {};

setInterval(cleaRegistered, DELAY); //clears the registered users

function processTgMessage(tgMsg) {
    console.log(tgMsg)
    setTimeout(TimeOut, CLEAR_SESSION);
    getUser(tgMsg, (user) => {
        console.log(user)
        if (user !== undefined) {

            if (user.state === LANG_SELECTED_MODE) {
                setLanguage(tgMsg, user);
            }
            if (user.state === RESPONSE_MODE) {

                publishTrans(user, tgMsg);
            }
            if(user.state === READY_MODE){
                breakPoint(tgMsg,user,true)
            }
        }
    });
}


tgBot.on("callback_query", (tgMsg) => {
    setTimeout(TimeOut, CLEAR_SESSION);
    let user = registeredUsers[tgMsg.from.id];
    if (tgMsg.data === "help") {
        helpFunction(tgMsg);
    }
    if (tgMsg.data === 'set-language') {

        tgBot.sendMessage(user.id, "Please type your language:");
        user.state = LANG_SELECTED_MODE;
    }
    if (user.state === LANG_MODE) {
        langSelected(user, tgMsg, true);
    }
    if (user.state === READY_MODE && tgMsg.data === "start-trans") {
        trans(user, tgMsg)
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "doc") {
        showDocumentation(user);
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "skip") {
        skipMsg(user, tgMsg);
    }
    if (user.state === RESPONSE_MODE && tgMsg.data === "similar") {
        showAndCacheSimilar(user);
    }
});

function getUser(tgMsg, cb) {
    let user = registeredUsers[tgMsg.from.id];
    if (user === undefined) {
        let user = initUser(tgMsg);
        registeredUsers[user.id] = user;
        loadUserFromDbByTgMsg(tgMsg, user, () => {

            initNewUserLang(tgMsg, user, (language) => {
                tgBot.sendMessage(user.id, "Your language set to " + language[1]);

                user.lang = language[0];
                registerToDB(tgMsg, user);
                cb(user);
                //breakPoint(tgMsg,user,true)

            });
        });
    }
    else
        cb(user)
}


/**skips to the next message**/
function skipMsg(user, tgMsg) {
    user.skippedMrddages.push(user.loadedMwMessages[user.currentMwMessageIndex]);
    user.currentMwMessageIndex++;
    trans(user, tgMsg);
}

function showDocumentation(user) {
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

function setLanguage(tgMsg) {

    let user = registeredUsers[tgMsg.from.id];
    if (user !== undefined) {

        let text = tgMsg.text;
        let checkLang = function (text, callback) {
            mediaWikiAPI.languageSearch(text, function (arg) {
                callback(arg);
            });
        };
        checkLang(text, function (arg) {
            let setLang = JSON.parse(JSON.stringify(arg.languagesearch));

            if (arg.languagesearch.length === 0) {
                tgBot.sendMessage(user.id, "Please type your language:");
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
                    user.state = LANG_MODE;
                    tgBot.sendMessage(user.id, "please select your language:", tgMsgOptions);
                }

            }
        })
    }
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


function initNewUserLang(tgMsg, user, cb) {
    const langCodeTgMsg = tgMsg.from.language_code;

    let language = langApi.findLang(langCodeTgMsg);
    //the case we know the conversion
    if (language) {
        cb(language);
    }
    else { //the user will type and choose is language
        user.state = LANG_SELECTED_MODE;
        tgBot.sendMessage(user.id, "Please type your language:");
    }
}

function registerToDB(tgMsg, user) {

    //should be i18n
    tgBot.sendMessage(user.id, "If it's not, please type '/help' for for further instruction");

    const url = OauthApi.OauthLogIn((signUrl, req_data) => {
        registeredUsers[user.id].req_data = req_data;
        const tgMsgOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: [[{text: 'SIGN IN', url: signUrl}]]
            })
        };
        user.state =VERIFIER_MODE ;
        tgBot.sendMessage(user.id, "Please sign in into your translatewiki account", tgMsgOptions);

    });
}

function langSelected(user, tgMsg, flag) {

    if (flag)
        user.lang = tgMsg.data;
    tgBot.sendMessage(user.id, "Your language set to " + user.fullLang[user.lang]);
    delete user.fullLang;
    registerToDB(tgMsg, user);
    processTgMessage(tgMsg)
}

function loadUserFromDbByTgMsg(tgMsg, user, cb) {

    const userID = user.id;
    const selectString = `SELECT * FROM user WHERE user_telegram_id = '${userID}'`;
    registeredUsers[user.id] = user;

    db.all(selectString, (error, rows) => {
        if (error !== null) {
            console.log(`Loading user ${userID} failed: ${error}`);
            return;
        }

        if (rows.length === 0) {
            cb();
            return;
        }
        if (rows.length === 1) {
            const insertStmtStr = "SELECT user_language FROM user WHERE user_telegram_id=" + userID + ";";
            db.all(insertStmtStr, (error, rows) => {
                if (error !== null)
                    return;
                user.lang = rows[0].user_language;
                user.state= READY_MODE
                breakPoint(tgMsg, user, false);
                return user;
            });
        }
    });
}

function addUserToDbByTgMsg(tgMsg, lang, token) {
    const userID = tgMsg.from.id;
    const insertStmtStr = `INSERT INTO user (user_telegram_id, user_language, user_oauth_secret) VALUES 
    (${userID},${JSON.stringify(lang)},${JSON.stringify(token)});`;
    db.run(insertStmtStr, (error) => {
        if (error !== null) {
            console.log(`Adding user ${userID} to the database failed: ${error}`);
        }
    });
}

function initUser(tgMsg) {
    return {
        id: tgMsg.from.id,
        firstName: tgMsg.from.first_name,
        lang: tgMsg.from.language_code,
        state: START_MODE,
        currentMwMessageIndex: 0,
        skippedMrddages: [],
        loadedMwMessages: [],
        loadedTranslationMemory: {},
        publishingTgMessages: {},
    };
}


function showUnTrans(user, tgMsg) {
    let targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    if (targetMwMessage === undefined) {
        breakPoint(tgMsg, user, false);
        // TODO: Show the welcome menu instead
        return;
    }
    console.log(targetMwMessage.title);
    mediaWikiAPI.getTranslationMemory(targetMwMessage.title, (translationMemory) => {

        targetMwMessage.translationMemory = translationMemory;

        if (targetMwMessage.translationMemory.length === 0) {
            //console.log(user.id, `No translation memory was found for "${targetMwMessage.title}"`);
        }
        const inlineKeyboard = [];
        user.state = RESPONSE_MODE;
        inlineKeyboard.push([{text: "Documentation", callback_data: "doc"}, {
            text: "Skip message",
            callback_data: "skip"
        }, {text: "Similar message", callback_data: "similar"}]);
        const tgMsgOptions = {
            reply_markup: JSON.stringify({inline_keyboard: inlineKeyboard}),
            disable_web_page_preview: true,
            parse_mode: "html"
        };
        if (targetMwMessage.translation !== null) {
            tgBot.sendMessage(user.id, targetMwMessage.definition, {disable_web_page_preview: true});
            tgBot.sendMessage(user.id, "<b>Current translation: </b>" + targetMwMessage.translation, tgMsgOptions);
        }
        else {
            tgBot.sendMessage(user.id, targetMwMessage.definition, tgMsgOptions);
        }



    });
}


function trans(user, tgMsg) {
    user.state = RESPONSE_MODE;

    if (user.currentMwMessageIndex === 10 || user.loadedMwMessages.length === 0) {
        loadUntranslated(user, (loadedMwMessages) => {
            user.state = RESPONSE_MODE;
            user.loadedMwMessages = loadedMwMessages;
            showUnTrans(user, tgMsg);
        });
        console.log("load");
    }
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


function showAndCacheSimilar(user) {
    const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    const title = targetMwMessage.title;

    if (user.loadedTranslationMemory[targetMwMessage.title] !== undefined) {
        const ttmCache = user.loadedTranslationMemory[targetMwMessage.title];
        for (let i = 0; i < ttmCache.length; i++) {
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
function publishTrans(user, tgMsg) {

    const text = tgMsg.text;
    const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];

    mediaWikiAPI.addTranslation(
        targetMwMessage.title,
        text,
        "Made with Telegram Bot",
        () => {
            // storePublishingTgMessage(tgMsg, targetMwMessage);
        }
    );

    user.publishingTgMessages[targetMwMessage.title] = text;
    user.currentMwMessageIndex++;

    trans(user, tgMsg);
}

function foo(tgMsg) {
    getUser(tgMsg, (user) => {
        if (user !== undefined) {
            if (user.state === VERIFIER_MODE){
                addUserToDbByTgMsg(tgMsg, user.lang, tgMsg.text.split(" ")[1]);
                user.state = READY_MODE;
                OauthApi.OauthLogIn2(tgMsg.text.split(" ")[1], user.req_data);
            }
        }
    });
}
tgBot.onText(/start/, foo);

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
