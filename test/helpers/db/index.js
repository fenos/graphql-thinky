import thinky from './thinky';
import models from './models';

/**
 * Clear database
 *
 * @returns {Promise}
 */
async function clearDB() {

  const tables = await thinky.r.tableList().run();
  var deleted = [];

  tables.forEach((table) => {
    const deletePromise = thinky.r.table(table).delete().run();
    deleted.push(deletePromise);
  });

  return Promise.all(deleted);
}

/**
 * Drop DB in use
 *
 * @returns {*}
 */
function dropDB() {
  return thinky.r.dbDrop(thinky._config.db).run();
}

export default {
  instance: thinky,
  models,
  clearDB,
  dropDB
};