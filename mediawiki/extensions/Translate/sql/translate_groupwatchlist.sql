-- Watchlist for message groups

DROP TABLE IF EXISTS /*_*/translate_groupwatchlist;

CREATE TABLE /*$wgDBprefix*/translate_groupwatchlist (
	tgw_id int unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT,
	-- Key to user.user_id
	tgw_user INTEGER NOT NULL,
	tgw_group TEXT NOT NULL default '',
	tgw_notificationtimestamp BLOB
) /*$wgDBTableOptions*/;

--Old version:
--DROP TABLE IF EXISTS /*_*/translate_groupwatchlist;
--CREATE TABLE /*_*/translate_groupwatchlist (
--	tgw_id int unsigned NOT NULL PRIMARY KEY AUTO_INCREMENT,
--	-- Key to user.user_id
--	tgw_user int unsigned NOT NULL,
--	tgw_group varchar(255) binary NOT NULL,
--	tgw_notificationtimestamp varbinary(14)
--) /*$wgDBTableOptions*/;