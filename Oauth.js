"use strict";

const CONSUMER_KEY = "e76bf74ff77abd1e1548ad6b55c94eec";
const CONSUMER_SECRET = "a0a7d0680d90321bcd41926e0ae7d5bb6b4c7e70";
const url = "https://translatewiki.net/w/index.php?title=Special:OAuth/initiate";
const opn = require('opn');

const request = require("request").defaults({
    jar: true
});

const qs = require("querystring");
const oauth_initiate = {
    callback: "oob", // already registered
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET
};

// OAuth1.0 - 3-legged server side flow (Twitter example)
// step 1
exports.OauthLogIn = function (cb) {
    request.get({url:url, oauth:oauth_initiate}, (e, r, body) => {


        // step 2
        const req_data = qs.parse(body);
        const uri = 'https://translatewiki.net/w/index.php?title=Special:OAuth/authorize'
            + '&' + qs.stringify({oauth_token: req_data.oauth_token, oauth_consumer_key: CONSUMER_KEY})
        // redirect the user to the authorize uri
        return cb(uri);

        // step 3
        // after the user is redirected back to your server

        const auth_data = qs.parse(body);
        const oauth_edit = {
            consumer_key: CONSUMER_KEY,
            consumer_secret: CONSUMER_SECRET,
            token: auth_data.oauth_token,
            token_secret: req_data.oauth_token_secret,
            verifier: auth_data.oauth_verifier
        };
        // console.log(oauth_edit)
        const apiUrl = 'https://translatewiki.net/w/api.php';
       // return uri;
        request.post({
                url: apiUrl,
                oauth: oauth_edit,
                form: {
                    action: "query",
                    format: "json",
                    meta: "tokens",
                    type: "csrf"
                }
            },
            (error, response, body) => {
                console.log("Edit token request over");

                if (error || response.statusCode !== 200) {
                    console.log("Error getting edit token");
                    console.log(`statusCode: ${response.statusCode}`);
                    console.log(`error: ${error}`);
                    return;
                }

                const title = "User:RoniTransBot/bottest";
                const translation = new Date().toString();
                const summary = "le summary";

                body = JSON.parse(body);
                console.log(body);

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
                        }
                    },
                    (error, response, body) => {
                        console.log("Edit request over");

                        if (error || response.statusCode !== 200) {
                            console.log("Error editing");
                            console.log(`statusCode: ${response.statusCode}`);
                            console.log(`error: ${error}`);
                            return;
                        }
                        console.log("Translation published");
                        // cb();
                    });
            }
        );
    });
};




