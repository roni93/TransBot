"use strict";

const request = require("request").defaults({
    jar: true
});

const apiUrl = "https://translatewiki.net/w/api.php";
const crypto = require('crypto');
const OAuth = require("oauth-1.0a");
const MediaWikiStrategy = require('passport-mediawiki-oauth').OAuthStrategy;
const passport = require('passport');
const CONSUMER_KEY = "47a716a9fca6845f7a734d31fcef9955";
const CONSUMER_SECRET = "f26a6e8982db87f7e6d1dc0db481f98f89029d25";

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


const auth = OAuth({
    consumer: {key: CONSUMER_KEY, secret: CONSUMER_SECRET},
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
});


exports.addTranslation = function (user, title, translation, summary, cb) {

    const token = {
        key: user.oauth_token,
        secret: user.oauth_token_secret
    };

    const request_data = {
        url: apiUrl + "?action=query&format=json&meta=tokens",
        method: 'POST',
        data: {}
    };

    request({
            url: request_data.url,
            method: request_data.method,
            form: request_data.data,
            headers: auth.toHeader(auth.authorize(request_data, token))
        }, function (error, response, body) {

            console.log("Edit token request over");

            if (error || response.statusCode !== 200) {
                console.log("Error getting edit token");
                console.log(`statusCode: ${response.statusCode}`);
                console.log(`error: ${error}`);

                return;
            }
            console.log(body);
            body = JSON.parse(body);

            const mwEditToken = body.query.tokens.csrftoken;
            console.log(`Got edit token ${mwEditToken}`);

            const request_data2 = {
                url: apiUrl + "?action=edit&format=json&title=" + title + "&text=" + translation + "&summery=" + summary + "&tags=TelegramBot",
                method: 'POST',
                data: {token: mwEditToken}
            };

            request({
                url: request_data2.url,
                method: request_data2.method,
                form: request_data2.data,
                headers: auth.toHeader(auth.authorize(request_data2, token))
            }, function (error, response, body) {
                console.log("Edit request over");
                console.log(response);
                if (error || response.statusCode !== 200) {
                    console.log("Error editing");
                    console.log(`statusCode: ${response.statusCode}`);
                    console.log(`error: ${error}`);
                    return;
                }

                console.log("trans body " + body);
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


