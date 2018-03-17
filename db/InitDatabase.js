"use strict";

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("telegram-bot.db");

db.serialize(function() {

    const userColumns = [
        "user_telegram_id TEXT PRIMARY KEY",
        "user_language TEXT",
        "verifier TEXT",
        "oauth_token TEXT",
        "oauth_token_secret TEXT",
        "first_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "num_of_trans INTEGER DEFAULT 0"
    ];

    const userColumnsClause = userColumns.join(", ");
    const userCreateStatement = `CREATE TABLE user (${userColumnsClause})`;


    db.run("DROP TABLE IF EXISTS user");
    db.run(userCreateStatement);
});

db.close();
