var config = require('config');
var main = require('./app/main.js');

main.process(config.shop, {
  user: config.db_user,
  password: config.db_password,
  host: config.db_host,
  name: config.db_name
}, config.path, function (err) {
  if (err) {
    return console.error(JSON.stringify(err));
  }
});
