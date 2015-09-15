var Twitter = require('twitter');
var neo4j = require('neo4j');
var bignum = require('bignum');

var db = new neo4j.GraphDatabase('http://neo4j:123456@localhost:7474');

var client = new Twitter({
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
});

var extractMeta = function (tw) {
    if (!tw) {
        return null;
    }
    var meta = {
        id: tw.id_str,
        created_at: tw.created_at,
        user: {
            screen_name: tw.user.screen_name,
            name: tw.user.name,
            description: tw.user.description,
            ref: 'https://twitter.com/' + tw.user.screen_name
        },
        tags: tw.entities.hashtags.map(function (tag) {
            return {
                text: tag.text.toLowerCase().replace("dershane", "dersane"),
                ref: 'https://twitter.com/search?q=%23' + tag.text.toLowerCase()
            };
        }),
        mentions: tw.entities.user_mentions.map(function (usr) {
            return {
                screen_name: usr.screen_name
            };
        }),
        text: tw.text,
        retweeted_status: extractMeta(tw.retweeted_status)
    };

    meta.ref = "https://twitter.com/" + meta.user.screen_name + "/status/" + meta.id;

    return meta;
};

var createTweet = function (tweet, callback) {
    if (tweet.retweeted_status) {
        createTweet(tweet.retweeted_status, function () {
            db.cypher({
                query: 'MATCH (tweet:Tweet {id: {tweet_id}}) ' +
                'MERGE (user:User {screen_name: {user}.screen_name}) ON CREATE SET user = {user} ' +
                'CREATE UNIQUE (user)-[:Retweeted]->(tweet)',
                params: {
                    tweet_id: tweet.retweeted_status.id,
                    user: tweet.user
                }
            }, function (err, results) {
                if (err) {
                    console.log(err);
                    return;
                }

                if (callback) {
                    callback();
                }
            });
        });

    }
    else {
        db.cypher({
            query: 'MERGE (tweet:Tweet {id: {tweet}.id}) ON CREATE SET tweet = {tweet} ' +
            'MERGE (user:User {screen_name: {user}.screen_name}) ON CREATE SET user = {user} ' +
            'CREATE UNIQUE (user)-[:Tweeted]->(tweet)',
            params: {
                tweet: {
                    id: tweet.id,
                    text: tweet.text,
                    ref: tweet.ref,
                    created_at: tweet.created_at
                },
                user: tweet.user
            }
        }, function (err, results) {
            if (err) {
                console.log(err);
                return;
            }

            createTags(tweet, 0, callback);
        });
    }


};

var createTags = function (tweet, i, cb) {
    if (i === tweet.tags.length) {
        if (cb) {
            cb();
        }
        return;
    }

    db.cypher({
        query: 'MATCH (tweet:Tweet {id: {tweet_id}}) ' +
        'MERGE (tag:Tag {text: {tag}.text}) ON CREATE SET tag = {tag} ' +
        'CREATE UNIQUE (tweet)-[:Tagged]->(tag)',
        params: {
            tweet_id: tweet.id,
            tag: tweet.tags[i],
        }
    }, function (err, results) {
        if (err) {
            console.log(err);
            return;
        }

        createTags(tweet, i + 1, cb);
    });
};

var targetTags = ["meb", "okul"]; //  ["egt", "egitim", "dersane", "dershane", "edtech"];
var maxTweets = 1000;
var tweetsPerLoad = 100;

var lastTweetId;
var currentTagIndex = 0;
var loadedTweets = 0;

var createTweets = function (statuses, i) {
    if (i === statuses.length) {
        loadedTweets += tweetsPerLoad;

        console.log(targetTags[currentTagIndex] + ": " + loadedTweets);

        if (loadedTweets < maxTweets) {
            var b = bignum(lastTweetId).sub('1').toString();
            loadTweets(b);
        } else if (currentTagIndex < targetTags.length - 1) {
            currentTagIndex++;
            loadedTweets = 0;
            loadTweets();
        }
        return;
    }

    // console.log(JSON.stringify(statuses[i], null, 2));

    var tweet = extractMeta(statuses[i]);

    // console.log(JSON.stringify(tweet, null, 2));

    lastTweetId = tweet.id;

    createTweet(tweet, function () {
        createTweets(statuses, i + 1);
    });
};

var loadTweets = function (max_id) {
    var params = {q: '#' + targetTags[currentTagIndex], count: tweetsPerLoad, lang:"tr"};
    if (max_id) {
        params.max_id = max_id;
    }
    client.get('search/tweets', params, function (error, tweets, response) {
        if (tweets.statuses.length > 0) {
            createTweets(tweets.statuses, 0);
        }
        else if (currentTagIndex < targetTags.length - 1) {
            currentTagIndex++;
            loadedTweets = 0;
            loadTweets();
        }
    });
};

loadTweets();