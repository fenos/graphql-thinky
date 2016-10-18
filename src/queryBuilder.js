import thinkySchema from 'thinky-export-schema';
import {ResolverOpts} from './resolver';
import {NodeAttributes} from './node';
import {isFunction,uniq,find,isObject} from 'lodash';

/**
 * Args to find options
 *
 * @param args
 * @param model
 * @param opts
 * @returns {{}}
 */
export function argsToFindOptions(args:Object,attributes:Object, model:Object, {maxLimit, requestedFields}:ResolverOpts = {maxLimit: 50}) {
  const result = {
      filter: {},
      attributes: [],
      limit: undefined,
      skip: undefined,
      orderBy: undefined
    },
    modelSchema = thinkySchema(model),
    modelAttributes = Object.keys(modelSchema.fields).concat('id'),
    modelRelations = Object.keys(modelSchema.relationships);

  if (args) {
    Object.keys(args).forEach(key => {
      if (modelAttributes.indexOf(key) !== -1) {
        result.filter = result.filter || {};
        result.filter[key] = args[key];
      }

      // Limit arg
      if (key === 'limit' && args[key]) {
        result.limit = parseInt(args[key], 10);
      }

      if (key === 'offset' && args[key]) {
        result.offset = parseInt(args[key], 10);
      }

      if (key === 'skip' && args[key]) {
        result.index = parseInt(args[key], 10);
      }

      if (key === 'order' && args[key]) {
        if (args[key].indexOf('reverse:') === 0) {
          result.orderBy = [args[key].substring(8), 'DESC'];
        } else {
          result.orderBy = [args[key], 'ASC'];
        }
      }
    });

    attributes = Object.keys(attributes).filter(field => {
      return (modelRelations.indexOf(field) === -1) &&
        modelSchema.fields.hasOwnProperty(field) &&
        modelSchema.fields[field] !== 'Virtual';
    }).concat(['id']);

    if (Array.isArray(requestedFields)) {
      attributes = attributes.concat(requestedFields);
    }

    result.attributes = uniq(attributes);

    // Set the maxLimit that can be set
    // for an offset or use that by default
    // if not explicitly disabled
    if (maxLimit !== false) {
      if (!result.offset) {
        result.offset = maxLimit || 100;
      }

      if (result.offset > maxLimit) {
        result.offset = maxLimit;
      }
    }

    return result;
  }
}

/**
 * Build query
 *
 * @param seq
 * @param args
 * @param thinky
 * @param options
 * @returns {*}
 */
export function buildQuery(seq, args:NodeAttributes, thinky) {
  let Query = seq;

  // Developer can overwrite query per node
  if (typeof args.query === 'function') {
    Query = args.query(seq, args, thinky);
  } else {

    // NOTE: selecting only necessary fields will gather a bit of performance
    // through your queries, BUT the drawback is that we might
    // add another DB query for sub-sequentials GraphQL requests
    // when asking for the the same resource. We can't gurantee all the fields
    // are available so we don't use Dataloader cache to return the results
    if (args.requestedFields) {
      if (Array.isArray(args.attributes)) {
        Query = seq.withFields(args.attributes);
      } else if (isObject(args.attributes)) {
        Query = seq.withFields(args.attributes);
      }
    }

    if (args.filter && args.filterQuery && Object.keys(args.filter).length > 0) {

      Object.keys(args.filter).forEach(fieldName => {
        if (isFunction(args.filter[fieldName])) {
          Query = Query.filter(args.filter[fieldName]);
          delete args.filter[fieldName];
        }
      });

      Query = Query.filter(args.filter);
    }

    if (args.orderBy && args.orderBy[1] === 'DESC') {
      Query = Query.orderBy(thinky.r.desc((args.orderBy[0])));
    } else if (args.orderBy && args.orderBy[0]) {
      Query = Query.orderBy(args.orderBy[0]);
    }

    if (args.offset) {
      Query = Query.slice(args.index, args.offset);
    }

    if (args.limit) {
      Query = Query.limit(args.limit);
    }
  }

  return Query;
}

/**
 * Build Count
 * @param model
 * @param relatedIds
 * @param FK
 * @param opts
 * @returns {*|void|Promise}
 */
export function buildCount(model,relatedIds:Array<string>,FK:string,opts:NodeAttributes) {
  const thinky = model._thinky;
  const r = thinky.r;
  opts.offset = false;
  opts.orderBy = false;

  if (relatedIds.length > 0 && FK) {
    let seq = model.getAll(r.args(uniq(relatedIds)),{index: FK})
      .withFields(['id',FK].concat(Object.keys(opts.filter)));

    seq = buildQuery(seq,opts,thinky);

    return seq.group(FK).ungroup().merge(function(selectionSet) {
      return {fullCount: selectionSet('reduction').count()}
    }).run();
  }

  const seq = buildQuery(model,opts,thinky);

  return seq.count().execute();
}

/**
 * Map count to result set
 * @param resultSet
 * @param countResults
 * @param FK
 * @returns {*}
 */
export function mapCountToResultSet(resultSet,countResults,FK) {
  return resultSet.map(row => {
    if (Array.isArray(row)) {
      return row.map(innerRow => {
        const findCount = find(countResults,{group: innerRow[FK]}) || {fullCount: 0};
        innerRow.fullCount = findCount.fullCount;
        return innerRow;
      });
    } else {
      const findCount = find(countResults,{group: row[FK]}) || {fullCount: 0};
      row.fullCount = findCount.fullCount;
      return row;
    }
  });
}
