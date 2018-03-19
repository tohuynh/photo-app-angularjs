'use strict';

var crypto = require('crypto');

/*
 * Return a salted and hashed password entry from a
 * clear text password.
 * @param {string} clearTextPassword
 * @return {object} passwordEntry
 * where passwordEntry is an object with two string
 * properties:
 *      salt - The salt used for the password.
 *      hash - The sha1 hash of the password and salt
 */
function makePasswordEntry(clearTextPassword) {
    const hash = crypto.createHash('sha1');
    const buf = crypto.randomBytes(8);
    hash.update(clearTextPassword + buf.toString('hex'));
    var passwordEntry = {hash: hash.digest('hex'), salt: buf.toString('hex')};
    return passwordEntry;
    
}

/*
 * Return true if the specified clear text password
 * and salt generates the specified hash.
 * @param {string} hash
 * @param {string} salt
 * @param {string} clearTextPassword
 * @return {boolean}
 */
function doesPasswordMatch(hash, salt, clearTextPassword) {
    const newHash = crypto.createHash('sha1');
    newHash.update(clearTextPassword + salt);
    return hash === newHash.digest('hex');
}

var cs142password =  {
    makePasswordEntry: makePasswordEntry,
    doesPasswordMatch: doesPasswordMatch
};

module.exports = cs142password;