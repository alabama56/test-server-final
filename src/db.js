"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = require("mysql");
const lodash_1 = require("lodash");
exports.default = () => { };
const poolConfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 2
};
exports.pool = mysql_1.createPool(poolConfig);
const formatArguments = (args = []) => {
    if (!lodash_1.isArray(args) || args.length === 0) {
        return '();';
    }
    let sql = '(';
    for (let i = 0, length = args.length - 1; i < length; ++i) {
        sql += '?, ';
    }
    sql += '?);';
    return sql;
};
const query = (sql, args) => {
    return new Promise((resolve, reject) => {
        exports.pool.getConnection((err, connection) => {
            if (err) {
                reject(err);
            }
            else {
                connection.query(sql, args, (err, resultsets) => {
                    connection.release();
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(resultsets);
                    }
                });
            }
        });
    });
};
exports.procedure = (procedure, args = []) => {
    return query(`CALL ${procedure}${formatArguments(args)}`, args);
};
