'use strict';

const util = require('monpy-util');
const Condition = require('../condition');
const mysql = require('mysql');
const debug = require('debug')('monpy-mysql');


module.exports = class BaseModel {

  /**
   *
   * コンストラクタ
   */
  constructor(opt) {
    // define const
    this.OPT_ALL = 'all';
    this.OPT_READ = 'read';
    this.OPT_WRITE = 'write';

    
    if(!new.target || new.target === BaseModel) {
        throw new Error('BaseModel is abstract class.');
    }

    this.name = new.target.toString().replace(/^\s*class\s*([^\s]*)[\S\s]+$/im, '$1');
    this.table_name = util.snakeCase(this.name);

    this._selecter = {
      read: '*',
      write: '*'
    };

    this.__isModelClass = true;
    this.clear();

  }

  /**
   *
   * toJSON
   */
  toJSON(){
    return {
      name: this.name,
      table_name: this.table_name,
      _selecter: this._selecter
    };
  }

  /**
   *
   * inspect
   */
  inspect(){
    return this.toJSON();
  }

  /**
   * setSelecterOption
   * Connection setting.
   */
  setSelecterOption(type, selecter) {

    if(['read', 'write', 'all'].indexOf(type) == -1)
      throw new Error('Paramater Error.');

    if(type == 'all' || type == 'read') {
      this._selecter.read = selecter;
    }

    if(type == 'all' || type == 'write') {
      this._selecter.write = selecter;
    }
  }

  /**
   *
   * SQL実行
   */
  query(sql, placeholder, selecter){

    var self = this;
    selecter = selecter || '*';
    debug(sql);
    if(placeholder)
      debug('[Placeholder]', placeholder);

    return new Promise( (resolve, reject) => {
      if(!global.__monpymysql || !global.__monpymysql.manager)
        return reject( new Error('PoolManager is not defined.\n Please call `require(\'monpy-db\').createPoolManager();`') );

      if(!sql)
        return reject( new Error('Parameter Error. sql is requaired.') );


      __monpymysql.manager.getConnection(selecter || '*').then(function(connection){

        connection.query(sql, placeholder, function(err, res, fld){
          connection.release();
          self.clear();

          if(err)
            return reject(err);
          resolve(res);

        });
      }).catch(reject);
    });
  }

  /**
   *
   * キャッシュクリア
   */
  clear(){
    this._field = null;
    this._order = null;
    this._limit = null;
    this._group = null;
    this._chache = [];
    this._innerJoins = [];
    this._distinct = false;
    return this;
  }

  /**
   *
   * INSERT
   */
  insert(data) {
    var sql = 'INSERT INTO ' + mysql.escapeId(this.table_name) + ' SET ?';
    return this.query(sql, data, this._selecter.write);
  }

  /**
   *
   * update
   */
  update(data, keys){

    var sql = 'UPDATE ' + mysql.escapeId(this.table_name) + ' SET ';
    var clone = JSON.parse(JSON.stringify(data));
    var i;
    if(!keys) {
      keys = ['id'];
    }

    if(util.isString(keys)){
      keys = [keys];
    }

    if(!util.isArray(keys) || keys.length == 0) {
      throw new Error('argument error. keys type only string|array');
    }

    var key, val;
    var wheres = [];
    for(i = 0; i < keys.length; i++) {
      key = keys[i];
      val = clone[key];
      wheres.push(mysql.escapeId(key) + ' = ' + mysql.escape(val));
      delete clone[key];
    }

    i = 0;
    for(key in clone) {
      if(i > 0)
        sql += ', ';

      sql += mysql.escapeId(key) + ' = ' + mysql.escape(clone[key]);
      i++; 
    }
    if(wheres.length > 0) {
      sql += ' WHERE ' + wheres.join(' AND ');
    }

    //console.log(sql);
    
    return this.query(sql, null, this._selecter.write);

  }

  /**
   *
   * 削除
   */
  delete(data, keys) {

    var sql = 'DELETE FROM ' + mysql.escapeId(this.table_name) + ' ';
    var i;
    if(!keys) keys = ['id'];
    if(util.isString(keys)) keys = [keys];
    if(!util.isArray(keys) || keys.length == 0) throw new Error('argument error. keys type only string|array');

    var key, val;
    var wheres = [];

    //console.log(data,keys);

    for(i = 0; i < keys.length; i++) {
      key = keys[i];
      val = data[key];
      //console.log(key, val);
      wheres.push(mysql.escapeId(key) + ' = ' + mysql.escape(val));
    }

    if(wheres.length > 0) {
      sql += ' WHERE ' + wheres.join(' AND ');
    }
    
    return this.query(sql, null, this._selecter.write);
  }

  /**
   *
   * limit
   */
  limit() {
    var offset, limit, len = arguments.length;

    if(len == 1) {
      this._limit = String(arguments[0]);
    } else if(len == 2) {
      this._limit = arguments[0] + ',' + arguments[1];
    } else {
      throw new Error('invalid arguments. limit([offset,] limit)');
    }
    return this;
  }

  /**
   *
   * field
   */
  field(fld) {
    var self = this;
    if(util.isArray(fld)) {
      
      fld.forEach(function(v, idx){
        fld[idx] = self.escapeId(v);
      });

      this._field = fld.join(',');

    } else if(util.isString(fld)) {
      this._field = fld;
    }
    return this;
  }

  /**
   *
   * c
   */
  c(fld) {
    return new Condition(this, fld);
  }

  /**
   *
   * order
   */
  order(fldName, type){

     if(!this._order) this._order = [];
     if(!type) type = 'ASC';

     if(typeof fldName == 'number') fldName = String(fldName);
     else fldName = this.escapeId(fldName);
     
     this._order.push(fldName + ' ' + type);
     return this;
  }

  /**
   *
   * escapeId
   */
  escapeId(v){
    if(v.charAt(0) == '`' && v.slice(-1) == '`')
      return v;

    return mysql.escapeId(v);
  }

  /**
   *
   * escape
   */
  escape(v){
    return mysql.escape(v);
  }

  /**
   *
   * group
   */
  group(fld) {

    var gval = '';
    if(util.isString(fld))
      gval = fld;

    if(util.isArray(fld)){
      var a = [];
      fld.forEach(function(f){
        a.push(mysql.escapeId(f));
      });
      gval = a.join(',');
    }
    this._group = gval;
    return this;
  }

  /**
   *
   * where
   */
  where(query, values){

    var buf = '';
    if(query && query.constructor && query.constructor == Condition) {
      // Condition class
      buf = query.toSQL();

    } else if(util.isString(query)) {

      if(!util.isArray(values))
        values = [values];

      var idx = 0, len = values.length;
      buf = query.replace(/\?/g, function(){
        if(idx < len) {
          return mysql.escape(values[idx++]);
        }

        idx++;
        return '?';
      });

    } else {

      throw new Error('Parameter error. query is String or Condition class only.');
    }

    this._chache.push(buf);

    return this;

  }

  /**
   *
   * getBy
   */
  getBy(fld, value) {
    this.clear();

    this.where( this.c(fld).eq(value) );
    return this.first();

  }

  /**
   *
   * getById
   */
  getById(value) {
    this.clear();

    this.where( this.c('id').eq(value) );
    return this.first();

  }

  /**
   *
   * first
   */
  first() {
    var sql = this.toSQL();
    var self = this;
    return new Promise(function(a, b){
      //console.log(sql);
      self.limit(1).query(sql, null, self._selecter.read).then(function(rows){
        if(rows && rows.length > 0) {
          return a(rows[0]);
        }
        a();
      }).catch(b);
    });
  }

  /**
   *
   * join
   */
  join(model, as){
    var buf = mysql.escapeId(model.table_name);
    if(as) {
      buf += ' ' + as;
    }
    this._innerJoins.push( buf );
    return this;

  }

  /**
   *
   * paginate
   */
  paginate(pageSize, pageNo){

    var self = this;
    return new Promise(function(relave, reject){
      var offset = pageSize * pageNo;

      var totalRecordSql = 'SELECT COUNT(1) AS totalRow FROM ' + mysql.escapeId(self.table_name);
      if(self._innerJoins && self._innerJoins.length) {
        totalRecordSql += ',' + self._innerJoins.join(',');
      }
      
      var wherebuf = self._whereToSql();
      if(wherebuf) totalRecordSql += ' WHERE ' + wherebuf;
      var sql = self.limit(offset, pageSize).toSQL();

      console.log(totalRecordSql);

      self.query(totalRecordSql, null, self._selecter.read).then(function(rows){

        var offset = pageSize * pageNo;
        var pager = {};
        pager.total = rows[0]['totalRow'];
        pager.totalPage = Math.ceil(pager.total / pageSize);
        pager.pageSize = pageSize;
        pager.pageNo = pageNo;

        self.query(sql, null, self._selecter.read).then(function(rows){

          relave({pager: pager, rows: rows});

        }).catch(reject);
      }).catch(reject);
    });
  }

  linkById(rows, fldName) {

    var self = this;
    var cache = {};

    if(!fldName)
      fldName = this.table_name + '_id';

    return new Promise(function(resolve, reject){

      asyncEach(rows, function(data, i, a, b){

        var id = rows[i][fldName];
        if(cache[id]) {
          rows[i][self.table_name] = cache[id];
          a();
        } else {
          self.where('id = ?', id).first().then(function(d){

            cache[id] = d;
            rows[i][self.table_name] = cache[id];
            a();

          }).catch(b);

        }
      }).then(function(){
        resolve(rows);
      }).catch(reject);

    });
  }

  /**
   *
   * get
   */
  get(){
    var sql = this.toSQL();
    return this.query(sql, null, this._selecter.read);
  }

  /**
   *
   * distinct
   */
  distinct() {
    this._distinct = true;
    return this;
  }

  /**
   *
   * toSQL
   */
  toSQL(){

    var buf = 'SELECT ' + (this._distinct ? 'DISTINCT ' : '') + this._fieldToSql() + ' FROM ' + mysql.escapeId(this.table_name);
    if(this._innerJoins && this._innerJoins.length) {
      buf += ',' + this._innerJoins.join(',');
    }

    var wherebuf = this._whereToSql();

    if(wherebuf) {
      buf += ' WHERE ' + wherebuf;
    }

    if(this._group) {
      buf += ' GROUP BY ' + this._group;
    }


    if(this._order && this._order.length && this._order.length > 0) {

      buf += ' ORDER BY ' + this._order.join(',');
    }

    if(this._limit) {
      buf += ' LIMIT ' + this._limit;
    }

    //console.log(buf);

    return buf;
  }

  //--------------------------------
  // Private methods
  //--------------------------------

  /**
   *
   * _whereToSql
   */
  _whereToSql() {
    if(this._chache && this._chache.length) {
      var buf = '';
      var len = this._chache.length;
      for(var i = 0; i < len; i++) {
        buf += (i > 0 ? ' AND ' : '') + this._chache[i];
      }
      return buf;
    }
    return null;
  }

  /**
   *
   * _fieldToSql
   */
  _fieldToSql(){

    var v;
    if(!this._field) {
      v = '*';
      if(this._innerJoins && this._innerJoins.length) {
        v = mysql.escapeId(this.table_name) + '.*';
        this._innerJoins.forEach(function(tbl){
          v += ',' + tbl + '.*';
        });
      }
    } else
      v = this._field;
    return v;
  }

  //--------------------------------
  // Static methods
  //--------------------------------
  /**
   *
   * isModelClass
   */
  static isModelClass(){
    return true;
  }
}


function asyncEach(array, next) {
  var len = array.length;
  var incr = 0;
  return new Promise(function(resolve, reject){
    function _exec(){
      if(incr >= len) return resolve();
      incr++;
      (new Promise(function(a, b){next(array[incr-1], incr-1, a, b);})).then(_exec).catch(reject);
    }
    _exec();
  });
}
