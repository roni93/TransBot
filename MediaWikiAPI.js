"use strict";

const request = require("request").defaults({
    jar: true
});

const apiUrl = "https://translatewiki.net/w/api.php";

const passport = require('passport');
const OauthApi = require("./Oauth.js");

const auth = OauthApi.cryptoHashFunction();

exports.getUntranslatedMessages = (function(){
let projectCode="tsint-0-all";
return function (languageCode, cb, projCode=null) {
    if(projCode){
	projectCode=projCode;
    }else{
    request.post({
            url: apiUrl,
            form: {
                action: "query",
                format: "json",
                prop: "",
                list: "messagecollection",
                mcgroup: projectCode,
                mclanguage: languageCode,
                mclimit: 5, // TODO: Make configurable
                mcfilter: "!optional|!ignored|!translated"
            }
        }, (error, response, body) => {
            body = JSON.parse(body);
            const mwMessageCollection = body.query.messagecollection;
            cb(mwMessageCollection);
        }
    );
}}
})();



exports.addTranslation = function (token, title, translation, summary, cb) {

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
    // console.log("Translation published");
    // cb();
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


            // TODO: Handle the case that it doesn't exist, invalid, etc.
            cb(translationaids.helpers.documentation.value);
        }
    );
};


exports.getMT = function (title, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "translationaids",
                format: "json",
                prop: "mt",
                title
            }
        }, (error, response, body) => {

            const translationaids = JSON.parse(body);
            if(translationaids.helpers.mt.length === 0){
                cb(false,"");
            }
            else{
                cb(true,translationaids.helpers.mt[0].target);

            }
        }
    );
};

exports.getMessageGroups= function(cb){
    request.post({
            url: apiUrl,
            form: {
                action: "query",
                format: "json",
                meta: "messagegroups"
            }
        }, (error, response, body) => {
            cb(JSON.parse(body).query.messagegroups);
        }
    );
};

exports.getOtherLang = function (title, cb) {
    request.post({
            url: apiUrl,
            form: {
                action: "translationaids",
                format: "json",
                prop: "inotherlanguages",
                title
            }
        }, (error, response, body) => {

            const translationaids = JSON.parse(body);
            console.log(body);
            // if(translationaids.helpers.mt.length === 0){
            //     cb(false,"");
            // }
            // else{
            //     cb(true,translationaids.helpers.mt[0].target);
            //
            // }
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
