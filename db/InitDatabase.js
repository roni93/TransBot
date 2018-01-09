"use strict";

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("telegram-bot.db");

db.serialize(function() {

    const userColumns = [
        "user_telegram_id TEXT PRIMARY KEY",
        "user_language TEXT",
        "user_oauth_secret TEXT",
    ];

    const userColumnsClause = userColumns.join(", ");
    const userCreateStatement = `CREATE TABLE user (${userColumnsClause})`;


    db.run("DROP TABLE IF EXISTS user");
    db.run(userCreateStatement);
});

db.close();
