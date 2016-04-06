'use strict';


var mysql = require('mysql');

if(!global.__monpymysql) global.__monpymysql = {};

exports.createPoolManager = function(opt){

  global.__monpymysql.manager = new PoolManager(opt);
  return global.__monpymysql.manager;

}
exports.BaseModel = require('./model');
exports.Condition = require('./condition');

class PoolManager {

  constructor(opt) {

    this._ = mysql;
    this._pool = this._.createPoolCluster(opt);

  }

  add(name, opt) {

    this._pool.add(name, opt);
    return this;

  }

  end() {
    this._pool.end();
  }

  getConnection(selecter) {

    var self = this;

    return new Promise( (resolve, reject) => {

      self._pool.getConnection(selecter, function(err, connection){

        if(err)
          return reject(err);

        resolve(connection);

      });
    });

  }
}
