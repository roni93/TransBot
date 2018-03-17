const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("db/telegram-bot.db");

let tgBotglobal;

exports.turnOnNotification = function (tgBot) {
    tgBotglobal = tgBot;
    setInterval(notify, 604800000);
};

exports.mileStones =  function (user, numberOfTrans) {
    console.log(numberOfTrans);
    if (numberOfTrans === 10) {
        tgBotglobal.sendMessage(user.id, "*You just translated your 10th String using this bot!* \u{1F44F}",{parse_mode: "Markdown"});
    }
    if (numberOfTrans === 100) {
        tgBotglobal.sendMessage(user.id, "*You just translated your 100th String using this bot!* \u{1F44F}",{parse_mode: "Markdown"});
    }
};


function notify() {

    const selectString = `SELECT * FROM user;'`;
    let datetime = new Date().toISOString();
    let stringDateArrayCur = datetime.split("T")[0].split("-");
    let todayDate = parseInt(stringDateArrayCur[0] + stringDateArrayCur[1] + stringDateArrayCur[2]);
    db.all(selectString, (error, rows) => {
        if (rows.length === 0) {
            return;
        }
        else {
            rows.forEach(function (user) {
                let stringDateArray = user.last_login.split(" ")[0].split("-");
                let curDate = parseInt(stringDateArray[0] + stringDateArray[1] + stringDateArray[2]);
                if (todayDate - curDate === 0) {

                    tgBotglobal.sendMessage(user.user_telegram_id, "\u{23F3} You have not translated in a while! \u{23F3}\r\n " +
                        "Just type *'start'* to start translating again",{parse_mode: "Markdown"});
                }
                console.log(todayDate - curDate)
            });
        }
    });
}