"use strict";

const jsonfile = require("jsonfile");
const qs = require("querystring");
const crypto  = require('crypto');
const OAuth = require("oauth-1.0a");

let config;
try {
    config = jsonfile.readFileSync("config.json");
} catch (e) {
    console.log(e);
}

const CONSUMER_KEY = config.CONSUMER_KEY;
const CONSUMER_SECRET = config.CONSUMER_SECRET;
const url = "https://translatewiki.net/w/index.php?title=Special:OAuth/initiate";

const request = require("request").defaults({
    jar: true
});



const auth = OAuth({
    consumer: {key: CONSUMER_KEY, secret: CONSUMER_SECRET},
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
});

const oauth_initiate = {
    callback: "oob", // already registered
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET
};


// OAuth1.0 - 3-legged server side flow (Twitter example)
// step 1
exports.OauthLogIn = function (cb) {
    const request_data = {
        url: url,
        method: 'GET',
        data: { oauth_callback: "oob"}
    };

    request({
        url: request_data.url,
        method: request_data.method,
        headers: auth.toHeader(auth.authorize(request_data))
    }, function(error, response, body) {
        const req_data = qs.parse(body);
        const uri = 'https://translatewiki.net/w/index.php?title=Special:OAuth/authorize'
            + '&' + qs.stringify({oauth_token: req_data.oauth_token, oauth_consumer_key: CONSUMER_KEY});
        console.log(req_data);
        cb(uri, req_data);
    });
};

exports.cryptoHashFunction = function () {
    return auth;
};

exports.OauthLogIn2 = function (verifier, req_data, cb) {

    console.log("verifier ", verifier);

    if (verifier === undefined) {
        console.log("verifier error from db");
        return;
    }

    const url2 = 'https://translatewiki.net/w/index.php?title=Special:OAuth/token';

    const request_data = {
        url: url2,
        method: 'GET',
        data: {oauth_verifier: verifier}
    };


    const token = {
        key: req_data.oauth_token,
        secret: req_data.oauth_token_secret,
    };

    request({
        url: request_data.url,
        method: request_data.method,
        headers: auth.toHeader(auth.authorize(request_data, token))
    }, function(error, response, body) {
        let perm_data = qs.parse(body);
        cb(perm_data)
    });

};
