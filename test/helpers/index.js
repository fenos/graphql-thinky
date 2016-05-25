require('babel-register');
require("babel-polyfill");

module.exports = {
  DB: require('./db').default,
  graphql: require('./graphql').default
}