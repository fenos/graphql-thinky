import Dataloader from 'dataloader';
import {find, uniq} from 'lodash';
import LoaderFilter from './loaderFilter';

/**
 * Model loader use Dataloader
 * to batch and cache DB calls
 * using PK or indexed fields
 */
class ModelLoader {

  constructor(model) {
    this.model = model;
    this.modelName = model._schema._model._name;
    this._loaders = {};
  }

  /**
   * Load by Id
   * @param modelId
   * @returns {IgnoredPaths|Object|*|void}
   */
  loadById(modelId) {
    return this._getOrCreateLoader('loadBy', 'id').load(modelId);
  }

  /**
   * Load by any field Name
   * @param fieldName
   * @param value
   * @returns {IgnoredPaths|Object|*|void}
   */
  loadBy(fieldName, value) {
    return this._getOrCreateLoader('loadBy', fieldName).load(value);
  }

  /**
   * Related loader
   * @param relationName
   * @param FKID
   * @returns {IgnoredPaths|Object|*|void}
   */
  related(relationName, FKID, filteringFn) {
    return this._getOrCreateLoader(
      'relation',
      relationName,
      this._queryRelations(relationName, 'id')
    ).load(FKID).then(results => {
      if (typeof filteringFn === 'function') {
        return filteringFn(new LoaderFilter(results));
      }
      return results;
    });
  }

  /**
   * Related by field name
   * @param relationName
   * @param fieldName
   * @param FKID
   * @returns {IgnoredPaths|Object|*|void}
   */
  relatedByField(relationName, fieldName, FKID) {
    return this._getOrCreateLoader(
      'relation',
      relationName,
      this._queryRelations(relationName, fieldName)
    ).load(FKID);
  }

  /**
   * Get or create a Dataloader for this Model
   * @param loaderPrefix
   * @param fieldName
   * @param loaderFn
   * @returns {*}
   * @private
   */
  _getOrCreateLoader(loaderPrefix, fieldName, loaderFn) {
    const loaderName = `${loaderPrefix}:${fieldName}`;
    const checkLoader = this._getLoader(loaderName);
    if (checkLoader) {
      return checkLoader;
    } else {
      const newloaderName = `${this.modelName}:${loaderName}`;
      const dataloaderFn = loaderFn || this._queryByField(fieldName);
      return this._loaders[newloaderName] = new Dataloader(dataloaderFn);
    }
  }

  /**
   * Query model by any field
   * @param fieldName
   * @returns {function(*=)}
   * @private
   */
  _queryByField(fieldName) {
    return (fieldNames) => {
      const r = this.model._thinky.r;
      return this.model.getAll(r.args(fieldNames), {
        index: fieldName
      }).run().then(results => {
        return this._mapResults(fieldNames,results,fieldName);
      });
    }
  }

  /**
   * Query relations
   * @param relationName
   * @returns {function(*)}
   * @private
   */
  _queryRelations(relationName, fieldName) {
    return (FkIds) => {
      const r = this.model._thinky.r;
      const query = this.model.getAll(r.args(FkIds), { index: fieldName }).getJoin({
        [relationName]: true,
      });
      return query.run().then(results => {
        return this._mapResults(FkIds,results,fieldName,relationName);
      });
    }
  }

  /**
   * Map Dataloader results
   * @param ids
   * @param results
   * @param fieldName
   * @param relationName
   * @returns {*}
   * @private
   */
  _mapResults(ids, results, fieldName, relationName) {
    return ids.map(fkId => {
      const resultMatch = find(results, { [fieldName]: fkId });
      if (resultMatch) {
        if (relationName) {
          return resultMatch[relationName];
        }
        return resultMatch;
      }
      return {};
    });
  }

  /**
   * Get a loader
   * @param loaderName
   * @returns {*}
   * @private
   */
  _getLoader(loaderName) {
    return this._loaders[`${this.modelName}:${loaderName}`];
  }

  /**
   * Get loaders
   * @returns {{}|*}
   * @private
   */
  _getLoaders() {
    return this._loaders;
  }
}

export default ModelLoader;