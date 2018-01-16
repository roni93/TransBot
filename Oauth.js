"use strict";

const CONSUMER_KEY = "3b92fd434ce0645f9dfa053260dd22ee";
const CONSUMER_SECRET = "2d8c2997376dd22064aea1e24aadb5b368127b5b";
const url = "https://translatewiki.net/w/index.php?title=Special:OAuth/initiate";

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
        console.log("req data ", req_data);


        const uri = 'https://translatewiki.net/w/index.php?title=Special:OAuth/authorize'
            + '&' + qs.stringify({oauth_token: req_data.oauth_token, oauth_consumer_key: CONSUMER_KEY});
        // redirect the user to the authorize uri

        cb(uri, req_data);


        // console.log("user state ", all_users[user_id].state);
        // // TODO WAITTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
        // while (all_users[user_id].state !== "waitForToken") {}
        // console.log("user state ", all_users[user_id].state);

        // return;
    });
};

exports.OauthLogIn2 = function (verifier, req_data) {
    // step 3
    // after the user is redirected back to your server
    // const userID = user_id;
    // const selectString = `SELECT user_oauth_secret FROM user WHERE user_telegram_id = '${userID}'`;
    //
    // var verifier = db.all(selectString, (error, rows) => {
    //     if (error !== null || rows.length!==1) {
    //         console.log(`Loading user ${userID} failed: ${error}`);
    //         return undefined;
    //     }
    //     return rows[0].user_oauth_secret;
    // });

    console.log("verifier ", verifier);

    if (verifier === undefined) {
        console.log("verifier error from db");
        return;
    }

    const oauth = {
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
        token: req_data.oauth_token,
        token_secret: req_data.oauth_token_secret,
        verifier: verifier
    };

    var url2 = 'https://translatewiki.net/w/index.php?title=Special:OAuth/token';

    request.get({url: url2, oauth: oauth}, function (e, r, body) {
        // ready to make signed requests on behalf of the user
        var perm_data = qs.parse(body);
        console.log("perm_date ", perm_data);

        //     , oauth =
        //         {
        //             consumer_key: CONSUMER_KEY
        //             , consumer_secret: CONSUMER_SECRET
        //             , token: perm_data.oauth_token
        //             , token_secret: perm_data.oauth_token_secret
        //         }
        //     , url = 'https://api.twitter.com/1.1/users/show.json'
        //     , qs =
        //         {
        //             screen_name: perm_data.screen_name
        //             , user_id: perm_data.user_id
        //         }
        //     ;
        // request.get({url: url, oauth: oauth, qs: qs, json: true}, function (e, r, user) {
        //     console.log(user)
        // });
    });
};
