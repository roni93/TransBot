"use strict";

const request = require("request").defaults({
    jar: true
});

const apiUrl = "https://translatewiki.net/w/api.php";


exports.getUntranslatedMessages = function (languageCode, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "query",
                format: "json",
                prop: "",
                list: "messagecollection",
                mcgroup: "ext-0-wikimedia",
                mclanguage: languageCode,
                mclimit: 10, // TODO: Make configurable
                mcfilter: "!optional|!ignored|!translated"
            }
        }, (error, response, body) => {
            body = JSON.parse(body);
            const mwMessageCollection = body.query.messagecollection;
            cb(mwMessageCollection);
        }
    );
};


exports.login = function( user, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "query",
                format: "json",
                prop: "",
                meta: "tokens",
                type: "login"
            } },
        (error, response, body) => {
            console.log("Token request over");

            if (error || response.statusCode !== 200) {
                console.log("Error getting token");
                console.log(`statusCode: ${response.statusCode}`);
                console.log(`error: ${error}`);

                return;
            }

            console.log(`Got MediaWiki login token: ${body}`);

            body = JSON.parse(body);

            const mwLoginToken = body.query.tokens.logintoken;

            console.log("Trying to authenticate");

            const userID = "319611936";
            const selectString = `SELECT user_oauth_secret FROM user WHERE user_telegram_id = '${userID}'`;


            request.post({
                    url: apiUrl,
                    form: {
                        action: "clientlogin",
                        logincontinue: "1",
                        state: "XYZ123",
                        code: user.oauth_token,
                        logintoken: mwLoginToken
                    } },
                (error, response, body) => {
                    if (error || response.statusCode !== 200) {
                        console.log("Error logging in");
                        console.log(`statusCode: ${response.statusCode}`);
                        console.log(`error: ${error}`);

                        return;
                    }
                    // console.log(body);
                    const res = JSON.parse(body);

                    if (cb) {
                        if (res.login.result === "Failed") {
                            cb(res.login.reason);
                        } else {
                            console.log("Successfully logged in!");
                            cb();
                        }
                    }
                }
            );
        }
    );
};

//
// exports.login = function (username, password, cb) {
//     request.post({
//             url: apiUrl,
//             form: {
//                 action: "query",
//                 format: "json",
//                 prop: "",
//                 meta: "tokens",
//                 type: "login"
//             }
//         },
//         (error, response, body) => {
//             console.log("Token request over");
//
//             if (error || response.statusCode !== 200) {
//                 console.log("Error getting token");
//                 console.log(`statusCode: ${response.statusCode}`);
//                 console.log(`error: ${error}`);
//
//                 return;
//             }
//
//             console.log(`Got MediaWiki login token: ${body}`);
//
//             body = JSON.parse(body);
//             const mwLoginToken = body.query.tokens.logintoken;
//             console.log("Trying to authenticate");
//             request.post({
//                     url: apiUrl,
//                     form: {
//                         action: "login",
//                         format: "json",
//                         lgname: username,
//                         lgpassword: password,
//                         lgtoken: mwLoginToken
//                     }
//                 },
//                 (error, response, body) => {
//                     if (error || response.statusCode !== 200) {
//                         console.log("Error logging in");
//                         console.log(`statusCode: ${response.statusCode}`);
//                         console.log(`error: ${error}`);
//
//                         return;
//                     }
//
//                     const res = JSON.parse(body);
//
//                     if (cb) {
//                         if (res.login.result === "Failed") {
//                             cb(res.login.reason);
//                         } else {
//                             console.log("Successfully logged in!");
//                             cb();
//                         }
//                     }
//                 }
//             );
//         }
//     );
// };
exports.addTranslation = function(title, translation, summary, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "query",
                format: "json",
                meta: "tokens",
                type: "csrf"
            } },
        (error, response, body) => {
            console.log("Edit token request over");

            if (error || response.statusCode !== 200) {
                console.log("Error getting edit token");
                console.log(`statusCode: ${response.statusCode}`);
                console.log(`error: ${error}`);

                return;
            }

            body = JSON.parse(body);

            const mwEditToken = body.query.tokens.csrftoken;
            console.log(`Got edit token ${mwEditToken}`);

            request.post({
                    url: apiUrl,
                    form: {
                        action: "edit",
                        format: "json",
                        title,
                        text: translation,
                        summary,
                        tags: "TelegramBot",
                        token: mwEditToken
                    } },
                (error, response, body) => {
                    console.log("Edit request over");

                    if (error || response.statusCode !== 200) {
                        console.log("Error editing");
                        console.log(`statusCode: ${response.statusCode}`);
                        console.log(`error: ${error}`);

                        return;
                    }

                    console.log("Translation published");

                    cb();
                });
        }
    );
};

exports.getDocumentation = function (title, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "translationaids",
                format: "json",
                prop: "documentation",
                title
            }
        }, (error, response, body) => {
            const translationaids = JSON.parse(body);

            console.log("translationaids, documentation:");
            console.log(translationaids);

            // TODO: Handle the case that it doesn't exist, invalid, etc.
            cb(translationaids.helpers.documentation.value);
        }
    );
};

exports.getTranslationMemory = function (title, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "translationaids",
                format: "json",
                prop: "ttmserver",
                title
            }
        }, (error, response, body) => {
            const translationaids = JSON.parse(body);

            // TODO: Handle the case that it doesn't exist, invalid, etc.
            cb(translationaids.helpers.ttmserver);
        }
    );
};

exports.languageSearch = function (languageString, callback) {

    request.post({
            url: apiUrl,
            form: {
                action: "languagesearch",
                format: "json",
                search: languageString
            }
        }, (error, response, body) => {

            body = JSON.parse(body);
            callback(body);


        }
    );

};
var MediaWikiStrategy = require('passport-mediawiki-oauth').OAuthStrategy;
var passport = require('passport');
exports.signIn = function (title, cb) {

    passport.use(new MediaWikiStrategy({
            consumerKey: 'e76bf74ff77abd1e1548ad6b55c94eec',
            consumerSecret: 'a0a7d0680d90321bcd41926e0ae7d5bb6b4c7e70',
            callbackURL: 'oob'
        }, function (token, tokenSecret, profile, done) {
            console.log(token);
            User.findOrCreate({mediawikiGlobalId: profile.id}, function (err, user) {
                console.log(3);
            });
        }
    ));
    // request.get('https://en.wikipedia.org/w/index.php?title=Special:OAuth/initiate?oauth_token=e76bf74ff77abd1e1548ad6b55c94eec&' +
    //     'oauth_token_secret=a0a7d0680d90321bcd41926e0ae7d5bb6b4c7e70').on('response', function (response) {
    //     console.log(response);
    // });

};

