const normalizedPath = require("path").join(__dirname);
const Models = {};

require("fs").readdirSync(normalizedPath).forEach(function(file) {
  if (file === 'index.js') return;
      
  const model = require("./" + file).default;
  const tableName = model.getTableName();
  Models[tableName] = model;
});

Object.keys(Models).forEach((modelname) => {
  if (typeof Models[modelname].relations === 'function') {

    Models[modelname].relations();
  }
})

export default Models;
