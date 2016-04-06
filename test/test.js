'use strict';

/*
 * コネクション定義
 *********************/
var poolManager = require('../index.js').createPoolManager();

poolManager.add('MASTER', {
  host     : 'localhost',
  port     : 3306,
  user     : 'dbuser',
  password : 'dbpass',
  database : 'ex_db'
});

poolManager.add('SLAVE', {
  host     : 'localhost',
  port     : 3307,
  user     : 'dbuser',
  password : 'dbpass',
  database : 'ex_db'
});


/*
 * モデル定義
 *********************/

var BaseModel = require('../model');

class User extends BaseModel{

  constructor(opt) {
    super();
    // Pool Setting
    this.setSelecterOption(this.OPT_WRITE,  'MASTER');
    this.setSelecterOption(this.OPT_READ,   '*');
  }
}

class AppRole extends BaseModel{
  constructor(opt) {
    super();
    this.setSelecterOption(this.OPT_WRITE,  'MASTER');
    this.setSelecterOption(this.OPT_READ,   '*');
  }

}


var modUser = new User();
var modAppRole = new AppRole();

