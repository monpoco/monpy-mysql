'use strict';

const mysql = require('mysql');
const util = require('monpy-util');

module.exports = class Condition {

  /**
   *
   * コンストラクタ
   */
  constructor(model, fld) {

    this.model = model;
    this.name = fld;
    this.fullname = this._getField();
    this.clear();
    this.wrapBracket = false;

  }

  toJSON(){
    return {
      fullname: this.fullname,
      name: this.name,
      model: this.model.toJSON()
    };
  }

  inspect(){
    return this.toJSON();
  }

  clear() {
    this._buf = [];
    this._c = [];
  }

  toSQL(p){
    var buf = this._buf.join(' '),
      i = -1,
      key;

    if(this.wrapBracket) {
      buf = ['(', buf, ')'].join('');
    }

    if(p)
      return ['(', buf, ')'].join('');

    return buf;
  }

  /**
   *
   * 等しい(=)
   */
  eq(val) {

    if(val === null || val === undefined) {
      this._push('AND', 'IS', 'NULL', true);
    } else
      this._push('AND', '=', val);
    return this;

  }

  /**
   *
   * 等しくない
   */
  not_eq(val) {
    if(val === null || val === undefined) {
      this._push('AND', 'IS NOT', 'NULL', true);
    } else
      this._push('AND', '<>', val);
    return this;

  }


  /**
   *
   * より大きい(>)
   */
  gt(val) {
    
    this._push('AND', '>', val);
    return this;
  }

  /**
   *
   * 以上(>=)
   */
  gteq(val) {
    
    this._push('AND', '>=', val);
    return this;
  }

  /**
   *
   * 未満(<)
   */
  lt(val) {

    this._push('AND', '<', val);
    return this;
  }

  /**
   *
   * 以下(<=)
   */
  lteq(val) {

    this._push('AND', '<=', val);
    return this;
  }

  /**
   *
   * 以下(<=)
   */
  or(cd) {

    this.wrapBracket = true;
    if(cd.constructor && cd.constructor == Condition) {

      if(!this._buf || !this._buf.length) {
        throw new Error('Paramater error');
      }
      var buf = cd.toSQL();
      this._buf.push('OR ' + buf);
      return this;

    } else {

      throw new Error('Paramater error');

    }
  }

  /**
   *
   * LIKE
   */
  like(val){
    this._buf.push(util.format('%s LIKE %s', this._getField(), mysql.escape(val)));
    return this;
  }

  between(min, max) {
    var val = util.format('%s BETWEEN %s AND %s', this._getField(), mysql.escape(min), mysql.escape(max) );
    _addbuf('AND', val);
  }

  not_between(min, max) {
    var val = util.format('%s NOT BETWEEN %s AND %s', this._getField(), mysql.escape(min), mysql.escape(max) );
    _addbuf('AND', val);
  }

  /**
   *
   * IN
   */
  in(val){
    var buf, s;
    if(val.constructor && val.constructor == Condition) {
      buf = 'SELECT ' + val.fullname + ' FROM ' + val.target.table_name;
      s = val.toSQL(); if(s) buf += ' WHERE ' + s;

      this._buf.push(util.format('%s IN (%s)', this._getField(), buf));

    } else if(util.isArray(val)) {

      buf = [];
      val.forEach(function(v){
        buf.push(mysql.escape(v));
      });
      this._buf.push(util.format('%s IN (%s)', this._getField(), buf.join(',')));
    } else {

      throw new Error('Paramater error');

    }
    return this;
  }

  /**
   *
   * Groping
   */
  groping(cd){
    this.wrapBracket = true;

  }

  /**
   *
   * fieldName
   */
  fieldName(as){
    var buf = this._getField();
    if(as)
      buf += ' AS ' + as;
    
     return buf;
  }

  /*
   * Private
   ---------------------------------- */
  _getField() {
    return mysql.escapeId(this.model.table_name + '.' + this.name);
  }

  _push(a, b, v, e){

    if(this._buf.length == 0)
      a = '';

    if(v && v.constructor && v.constructor === Condition) {
      v = v._getField(); 
      e = true;
    }

    this._buf.push(util.format('%s %s %s %s', a, this._getField(), b, e ? v : mysql.escape(v)));
  }

  _addbuf(a, v) {
    if(this._buf.length)
      v = a + ' ' + v;
    this._buf.push(v);
  }
}