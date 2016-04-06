# monpy-mysql

## Install

```
npm install monpy-mysql --save
```

## Introduction

```
'use strict';

const co = require('co');
const monpyMysql = require('monpy-mysql');
const BaseModel = monpyMysql.BaseModel;
// or
// const BaseModel = require('monpy-mysql/model');

const dbconfig = {
    "connectionLimit": 10,
    "host" : "localhost",
    "user" : "dbuser",
    "port" : 3306,
    "password" : "password",
    "database" : "exampledb"
};

/*
Create connection pooling
----------------- */
var poolManager = monpyMysql.createPoolManager();
poolManager.add('MASTER', dbconfig);

/*
Model Class
----------------- */

/*
CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
*/
class Users extends BaseModel{
    constructor() {
        super();
        // Set connection settings
        this.setSelecterOption(this.OPT_WRITE,  'MASTER');
        this.setSelecterOption(this.OPT_READ,   '*');
    }
}

/*
CREATE TABLE `posts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(64) NOT NULL,
  `message` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
*/

class Posts extends BaseModel{
    constructor() {
        super();
        // Set connection settings
        this.setSelecterOption(this.OPT_WRITE,  'MASTER');
        this.setSelecterOption(this.OPT_READ,   '*');
    }
}

co(function*(){

    var mUsers = new Users();
    var mPosts = new Posts();
    
    var users = yield mUsers.get();
    // => SELECT * FROM `users`;
    
    var user = yield mUsers.getById(1);
    // => SELECT * FROM `users` WHERE `user`.`id` = 1;
    
    var to = new Date();
    var from = new Date(to - 86400000);
    var users = yield mUsers.where(
        mUsers.c('created_at').gteq(from).ltgt(to)
    ).get();
    // => SELECT * FROM `user` WHERE `user`.`created_at` >= {from} AND `user`.`created_at` <= {to};
    
    // join table
    var fields = [
        mUsers.c('id').fieldName('user_id'),
        mUsers.c('name').fieldName(),
        mPosts.c('id').fieldName(),
        mPosts.c('message').fieldName(),
        mPosts.c('created_at').fieldName()
    ].join(',');
    var posts = mPosts.field(fields)
                .join( mUsers )
                .where( mPosts.c('user_id').eq( mUsers.c('id') )
                .get();
    // => SELECT
    //      `users`.`id` AS user_id,
    //      `users`.`name`, 
    //      `posts`.`id`, 
    //      `posts`.`message`, 
    //      `posts`.`created_at`
    //    FROM `posts`, `users`
    //    WHERE `posts`.`user_id` = `users`.`id`
    
}).then(fucntion(){

    poolManager.end();
    
});
```


## Documents
