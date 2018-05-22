"use strict";

const DELAY = 3600000;
const CLEAR_SESSION = 300000;

const mediaWikiAPI = require("./MediaWikiAPI.js");
const langApi = require("./languageApi");
const OauthApi = require("./Oauth.js");
const notification = require("./notification.js");

const tgFancyBot = require("tgfancy");
const jsonfile = require("jsonfile");

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./telegram-bot.db");

let config;
let flags;
try {
    config = jsonfile.readFileSync("config.json");
    flags = jsonfile.readFileSync("flags.json");
} catch (error) {
    console.log(error);
}

const tgBot = new tgFancyBot(config.token, {polling: true});

const express = require('express');
const app = express();
const port = parseInt(process.env.PORT, 10);


let registeredUsers = {};
let dictTokenToId = {};

setInterval(cleaRegistered, DELAY); //clears the registered users
notification.turnOnNotification(tgBot);

function processTgMessage(tgMsg) {
    setTimeout(TimeOut, CLEAR_SESSION);
    getUser(tgMsg, (user) => {
        if (user !== undefined) {

            if (user.state === flags.LANG_SELECTED_MODE || user.state === flags.UPDATE_LANG) {
                if (user.state === flags.LANG_SELECTED_MODE)

                    setLanguage(tgMsg, user, false);
                else
                    setLanguage(tgMsg, user, true);
                return;
            }
            else if (user.state === flags.RESPONSE_MODE) {
                const targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
                if (targetMwMessage === undefined) {
                    helpFunction(tgMsg);
                    return;
                }
                publishTrans(user, tgMsg, targetMwMessage);
                return;

            }
            else if ((user.state === flags.READY_MODE || tgMsg.text === "/help") && user.state !== flags.RESPONSE_MODE) {
                helpFunction(user);
                return;
            }


        }
    });
}


tgBot.on("callback_query", (tgMsg) => {
    setTimeout(TimeOut, CLEAR_SESSION);
    const user = registeredUsers[tgMsg.from.id];
    if (tgMsg.data === "help") {
        helpFunction(user);
    }
    if (tgMsg.data === 'set-language') {
        tgBot.sendMessage(user.id, "Welcome! Please type your language.");
        user.state = flags.LANG_SELECTED_MODE;
    }
    if (tgMsg.data === "instructions") {
        notifyUser(tgMsg, user)
    }
    if (tgMsg.data === "signout") {
        tgBot.sendMessage(user.id, "You have been signed out successfully");

        db.all("DELETE FROM user WHERE user_telegram_id = " + user.id + ";", (error) => {
            delete registeredUsers[user.id];
            if (error !== null) {
                return;

            }
        });
    }
    if (tgMsg.data === "back-trans") {
        trans(user, tgMsg)
    }
    if (user.state === flags.VERIFIER_MODE && tgMsg.data === 'change-lang') {
        initNewUserLang(tgMsg, user, false, () => {
        })
    }
    if (tgMsg.data === "update-lang") {
        user.state = flags.UPDATE_LANG;
        tgBot.sendMessage(user.id, "Please type your language.");
    }
    if (user.state === flags.LANG_MODE) {
        langSelected(user, tgMsg, true, false);
    }
    if (user.state === flags.READY_MODE && tgMsg.data === "start-trans") {

        trans(user, tgMsg)
    }
    if (user.state === flags.RESPONSE_MODE && tgMsg.data === "doc") {
        showDocumentation(user);
    }
    if (user.state === flags.RESPONSE_MODE && tgMsg.data === "mt") {
        showMT(user);
    }
    if (user.state === flags.RESPONSE_MODE && tgMsg.data === "skip") {
        skipMsg(user, tgMsg);
    }
    if (user.state === flags.RESPONSE_MODE && tgMsg.data === "similar") {
        showAndCacheSimilar(user);
    }
});

function showMT(user) {
    tgBot.sendMessage(user.id, user.mt);
    user.mt = "";
}

function notifyUser(tgMsg, user) {
    tgBot.sendMessage(user.id, "Some explanation...");
    helpFunction(user)
}

function getUser(tgMsg, cb) {
    let user = registeredUsers[tgMsg.from.id];
    if (user === undefined) {
        if (tgMsg.text === '/help') {
            tgMsg.text = "start";
            processTgMessage(tgMsg);
            return;
        }
        let user = initUser(tgMsg);
        registeredUsers[user.id] = user;
        loadUserFromDbByTgMsg(tgMsg, user, () => {
            initNewUserLang(tgMsg, user, true, (language) => {

                tgBot.sendMessage(user.id, `Your language is set to ${language[1]}.\nIf I'm wrong, please type '_/help_' at any moment for further instructions.`, {parse_mode: "markdown"});
                user.lang = language[0];
                registerToDB(tgMsg, user);
                console.log(`user ${user.id} online.`);
                cb(user);
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

    tgBot.sendMessage(user.id, user.doc, {parse_mode: "Markdown"});
    user.doc = "";

}

function breakPoint(tgMsg, user, flag) {
    if (!flag) {
        let options = {
            parse_mode: "markdown",
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

function setLanguage(tgMsg, user, flag) {

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
                    user.state = flags.LANG_MODE;
                    user.lang = Object.keys(arg.languagesearch)[0];
                    langApi.addNewLang(tgMsg, user.lang);
                    langSelected(user, tgMsg, false, flag);
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
                    user.state = flags.LANG_MODE;
                    tgBot.sendMessage(user.id, "Please select your language.", tgMsgOptions);
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


function initNewUserLang(tgMsg, user, flag, cb) {
    const langCodeTgMsg = tgMsg.from.language_code;
    let language = langApi.findLang(langCodeTgMsg);
    //the case we know the conversion
    if (language && flag) {
        cb(language);
    }
    else { //the user will type and choose is language
        user.state = flags.LANG_SELECTED_MODE;
        tgBot.sendMessage(user.id, "Please type your language.");
    }
}

function registerToDB(tgMsg, user) {
    //should be i18n
    // tgBot.sendMessage(user.id, "If I'm wrong, please type '_/help_' at any moment for further instructions.", {parse_mode: "markdown"});

    OauthApi.OauthLogIn((signUrl, req_data) => {
        registeredUsers[user.id].req_data = req_data;
        dictTokenToId[req_data.oauth_token] = user;
        const tgMsgOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: [[{text: 'SIGN IN', url: signUrl}]]
            })
        };
        user.state = flags.VERIFIER_MODE;
        tgBot.sendMessage(user.id, "Please sign in into your translatewiki account.", tgMsgOptions);

    });
}

function langSelected(user, tgMsg, flag, flag_update) {
    if (flag) {
        langApi.addNewLang(tgMsg, tgMsg.data);
        user.lang = tgMsg.data;
    }
    tgBot.sendMessage(user.id, `Your language is set to ${user.fullLang[user.lang]}.`, {parse_mode: "markdown"});
    delete user.fullLang;
    if (flag_update) {
        user.currentMwMessageIndex = 0;
        user.loadedMwMessages = [];
        user.loadedTranslationMemory = {};
        user.translatedTgMessages = {};
        user.mt = "";
        db.all(`UPDATE user SET user_language = ${JSON.stringify(user.lang)} WHERE user_telegram_id = ${user.id}  ;`, (error) => {
            if (error !== null) {
                return;
            }
            user.state = flags.READY_MODE;

            helpFunction(user);
            return;
        });
    }
    else
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
                user.state = flags.READY_MODE;
                breakPoint(tgMsg, user, false);
                return user;
            });
            db.all("UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE user_telegram_id = " + userID + ";", (error) => {
                if (error !== null)
                    return;
            });
        }
    });
}

function addUserToDbByTgMsg(userID, lang, token) {
    const insertStmtStr = `INSERT INTO user (user_telegram_id, user_language, verifier, oauth_token, oauth_token_secret) VALUES
                (${userID},${JSON.stringify(lang)},${JSON.stringify(token)},1,1);`;
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
        state: flags.START_MODE,
        currentMwMessageIndex: 0,
        skippedMrddages: [],
        loadedMwMessages: [],
        loadedTranslationMemory: {},
        translatedTgMessages: {},
        mt: "",
        doc: ""
    };
}


function showUnTrans(user, tgMsg) {
    let targetMwMessage = user.loadedMwMessages[user.currentMwMessageIndex];
    if (targetMwMessage === undefined) {
        breakPoint(tgMsg, user, false);
        return;
    }
    const title = targetMwMessage.title;
    mediaWikiAPI.getDocumentation(title, (documentation) => {
        if (documentation !== null) {
            user.doc = documentation
        }
    });


    mediaWikiAPI.getTranslationMemory(targetMwMessage.title, (translationMemory) => {

        targetMwMessage.translationMemory = translationMemory;
        const inlineKeyboard = [];
        user.state = flags.RESPONSE_MODE;
        inlineKeyboard.push([{text: "Skip message", callback_data: "skip"}]);
        if (targetMwMessage.translationMemory.length > 0) {
            inlineKeyboard[0].push({text: "Similar message", callback_data: "similar"});
        }
        if (user.doc !== "") {
            inlineKeyboard[0].push({text: "Documentation", callback_data: "doc"});
        }

        mediaWikiAPI.getMT(targetMwMessage.title, (flag, target) => {
            if (flag) {
                user.mt = target;
                inlineKeyboard.push([{text: "Machine translation", callback_data: "mt"}]);
            }
            const tgMsgOptions = {
                reply_markup: JSON.stringify({inline_keyboard: inlineKeyboard}),
                disable_web_page_preview: true,
            };

            if (targetMwMessage.translation !== null) {
                tgBot.sendMessage(user.id, targetMwMessage.definition, {
                    disable_web_page_preview: true
                });
                tgBot.sendMessage(user.id, "*Current translation:*", {parse_mode: "Markdown"});
                tgBot.sendMessage(user.id, targetMwMessage.translation, tgMsgOptions);
            }
            else {
                tgBot.sendMessage(user.id, targetMwMessage.definition, tgMsgOptions);
            }
        });
    });
}


function trans(user, tgMsg) {
    user.state = flags.RESPONSE_MODE;
    if (user.currentMwMessageIndex === user.loadedMwMessages.length || user.loadedMwMessages.length === 0) {

        loadUntranslated(user, (loadedMwMessages, flag) => {
            if (flag) {
                user.state = flags.RESPONSE_MODE;
                user.loadedMwMessages = loadedMwMessages;
                showUnTrans(user, tgMsg);

            }
            else {
                tgBot.sendMessage(user.id, "Nothing to translate!");
                processTgMessage(tgMsg);
            }

        });
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
            cb(user.loadedMwMessages, true)
        } else {
            cb(user.loadedMwMessages, false)
        }

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

function publishTrans(user, tgMsg, targetMwMessage) {

    const text = tgMsg.text;
    if (tgMsg.text === "/help") {
        return helpFunction(user);

    }

    const token = {
        key: user.oauth_token,
        secret: user.oauth_token_secret
    };
    mediaWikiAPI.addTranslation(token, targetMwMessage.title, text, "Made with Telegram Bot",
        () => {
            if (!user.translatedTgMessages[tgMsg.message_id]) {
                user.currentMwMessageIndex++;

                db.all("UPDATE user SET num_of_trans=num_of_trans+1 WHERE user_telegram_id = " + user.id + ";", (error) => {

                    if (error !== null)
                        return;
                });
                db.all("SELECT num_of_trans FROM user WHERE user_telegram_id=" + user.id + ";", (error, rows) => {
                    notification.mileStones(user, rows[0].num_of_trans);
                    if (error !== null)
                        return;
                });
                trans(user, tgMsg);
            }
            user.translatedTgMessages[tgMsg.message_id] = targetMwMessage;
        }
    );
}

tgBot.on("edited_message", (tgMsg) => {
    getUser(tgMsg, (user) => {
        if (user !== undefined) {
            publishTrans(user, tgMsg, user.translatedTgMessages[tgMsg.message_id])
        }
    });
});


app.use('/translate-bot/auth', function (req, res) {
    const verifier = req.query.oauth_verifier;
    const token = req.query.oauth_token;

    if (verifier !== undefined && token !== undefined) {
        const user = dictTokenToId[token];

        if (user !== undefined) {
            if (user.state === flags.VERIFIER_MODE) {
                addUserToDbByTgMsg(user.id, user.lang, verifier);
                OauthApi.OauthLogIn2(verifier, user.req_data, (perm_data) => {
                    user["oauth_token"] = perm_data.oauth_token;
                    user["oauth_token_secret"] = perm_data.oauth_token_secret;

                    const oauth_token0 = perm_data.oauth_token;
                    const oauth_token_secret0 = perm_data.oauth_token_secret;
                    const insertStmtStr = `UPDATE user SET oauth_token = ${JSON.stringify(oauth_token0)},oauth_token_secret = ${JSON.stringify(oauth_token_secret0)}
                WHERE user_telegram_id = '${user.id}';`;
                    db.run(insertStmtStr, (error) => {

                    });
                });
                user.state = flags.READY_MODE;
                tgBot.sendMessage(user.id, "You have successfully logged in!");
                helpFunction(user);

            }
        }

        res.redirect('https://telegram.me/ronitranslatebot');

    }
    // res.send("Something wen't wrong. Please try again.");
});


app.listen(port);

tgBot.onText(/.*/, processTgMessage);


function helpFunction(user) {
    if (user === undefined) {
        return;
    }
    let tgMsgOptions = {};
    if (user.state === flags.VERIFIER_MODE) {
        tgMsgOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Set my language', callback_data: 'change-lang'}, {
                        text: 'Instructions',
                        callback_data: 'instructions'
                    }]
                ]
            })
        };
    }
    else {
        tgMsgOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Instructions', callback_data: 'instructions'}, {
                        text: 'Translate',
                        callback_data: 'back-trans'
                    }], [{
                        text: 'SIGN OUT', callback_data: 'signout'
                    }, {text: "Change langauge", callback_data: "update-lang"}]]
            })
        };
    }
    tgBot.sendMessage(user.id, "What would you like to do?", tgMsgOptions);
}

function TimeOut() {
    //exit
}

function cleaRegistered() {
    registeredUsers = {};
}