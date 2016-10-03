import Dataloader from 'dataloader';
import { find, uniq, maxBy, groupBy, flatten } from 'lodash';
import {NodeAttributes} from './../node';
import {buildQuery,buildCount,mapCountToResultSet} from '../queryBuilder';
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
    return this._getOrCreateLoader('loadBy', 'id')
      .load(modelId).then(results => {
        return new LoaderFilter(results);
      });
  }

  /**
   * Load by any field Name
   * @param fieldName
   * @param value
   * @returns {IgnoredPaths|Object|*|void}
   */
  loadBy(fieldName, value) {
    return this._getOrCreateLoader('loadBy', fieldName)
      .load(value).then(results => {
        return new LoaderFilter(results);
      });
  }

  /**
   * Related loader
   * @param relationName
   * @param FKID
   * @returns {IgnoredPaths|Object|*|void}
   */
  async related(relationName, FKID, options:NodeAttributes) {
    const params = this._batchParamsKeys(options);

    const filterOpt = await this._getOrCreateLoader(
      'query:id',
      relationName,
      this._queryRelationLoader,
    ).load(params);

    return await this._getOrCreateLoader(
      `relation:${JSON.stringify(filterOpt)}`,
      relationName,
      this._queryRelations(relationName, 'id', filterOpt),
    ).load(FKID).then(results => {
      return new LoaderFilter(results,options);
    });
  };

  /**
   * Related by field name
   * @param relationName
   * @param fieldName
   * @param FKID
   * @returns {IgnoredPaths|Object|*|void}
   */
  async relatedByField(relationName:string, fieldName:string, FKID:any, options:NodeAttributes) {
    const params = this._batchParamsKeys(options);

    const filterOpt = await this._getOrCreateLoader(
      `query:${fieldName}`,
      relationName,
      this._queryRelationLoader,
    ).load(params);

    return this._getOrCreateLoader(
      `relation:${JSON.stringify(filterOpt)}`,
      relationName,
      this._queryRelations(relationName, fieldName)
    ).load(FKID).then(results => {
      return new LoaderFilter(results);
    });
  }

  /**
   * Get or create a Dataloader for this Model
   * @param loaderPrefix
   * @param fieldName
   * @param loaderFn
   * @returns {*}
   * @private
   */
  _getOrCreateLoader(loaderPrefix:string, fieldName:string, loaderFn?:func<Promise>, loaderOpt = {}) {
    const loaderName = `${loaderPrefix}:${fieldName}`;
    const checkLoader = this._getLoader(loaderName);
    if (checkLoader) {
      return checkLoader;
    }
    const newloaderName = `${this.modelName}:${loaderName}`;
    const dataloaderFn = loaderFn || this._queryByField(fieldName);
    const Loader = new Dataloader(dataloaderFn, loaderOpt);
    this._loaders[newloaderName] = Loader;
    return Loader;
  }

  /**
   * Batch param keys
   * @param filterQuery
   * @param filter
   * @param attributes
   * @param rest
   * @returns {*}
   * @private
   */
  _batchParamsKeys({filterQuery,filter,attributes, ...rest}:NodeAttributes) {
    if (filterQuery) {
      rest.filter = filter;
      rest.attributes = attributes;
    } else {
      rest.filter = {};
      rest.attributes = [];
    }
    return Object.keys(rest).sort()
    .reduce((obj, objKey) => {
      obj[objKey] = rest[objKey];
      return obj;
    },{});
  }

  /**
   * Query relation Loader
   * @param queryParams
   * @returns {*}
   * @private
   */
  async _queryRelationLoader(queryParams:Array<NodeAttributes>) {
    return queryParams.map(params => {
      const same = queryParams.filter(qp => {
        return (
          JSON.stringify(params.filter) == JSON.stringify(qp.filter) &&
          params.index == qp.index
        );
      });

      if (same.length > 0) {
        const higherOffset = maxBy(same, 'offset');
        const allAttributes = uniq(flatten(same.map(opts => opts.attributes)));
        higherOffset.attributes = allAttributes;
        return higherOffset;
      }
      return params;
    });
  }

  /**
   * Query model by any field
   * @param fieldName
   * @returns {function(*=)}
   * @private
   */
  _queryByField(fieldName) {
    return fieldNames => {
      const r = this.model._thinky.r;
      return this.model.getAll(r.args(uniq(fieldNames)), {
        index: fieldName
      }).run().then(results => {
        return this._mapResults(fieldNames, results, fieldName);
      });
    };
  }

  /**
   * Query relations
   * @param relationName
   * @returns {function(*)}
   * @private
   */
  _queryRelations(relationName, fieldName, nodeOpts) {
    return async FkIds => {
      const thinky = this.model._thinky;
      const r = thinky.r;
      const query = this.model.getAll(r.args(uniq(FkIds)), { index: fieldName })
        .withFields(fieldName).getJoin({
          [relationName]: {
            _apply(seq) {
              return buildQuery(seq,nodeOpts,thinky);
            }
          }
        });
      const results = await query.run();

      const resultSet = this._mapResults(FkIds, results, fieldName, relationName);

      // If we need to count result
      // I'll do another query
      if (nodeOpts.count) {
        const relation = this.model._joins[relationName];
        const FK = relation.rightKey;
        const countResults = await this._countRelated(
          flatten(resultSet.map(row => row.map(innerRow => innerRow[FK]))),
          relationName,
          nodeOpts,
        );
        return mapCountToResultSet(resultSet,countResults,FK);
      }

      return resultSet;
    };
  }

  /**
   * Count related result set
   * @param relatedIds
   * @param relationName
   * @param opts
   * @returns {*|void|Promise}
   * @private
   */
  _countRelated(relatedIds,relationName,opts) {
    const relation = this.model._joins[relationName];
    const FK = relation.rightKey;

    return buildCount(relation.model,relatedIds,FK,opts);
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
