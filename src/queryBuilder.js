import thinkySchema from 'thinky-export-schema';
import {ResolverOpts} from './resolver';
import {isFunction,uniq,find} from 'lodash';

/**
 * Args to find options
 *
 * @param args
 * @param model
 * @param opts
 * @returns {{}}
 */
export function argsToFindOptions(args, model, opts:ResolverOpts = {maxLimit: 50}) {
  const result = {
      filter: {},
      limit: undefined,
      skip: undefined,
      order: undefined
    },
    modelSchema = thinkySchema(model),
    attributes = Object.keys(modelSchema.fields).concat('id');

  opts.maxLimit = (opts.maxLimit === undefined) ? false : parseInt(opts.maxLimit, 10);

  if (args) {
    Object.keys(args).forEach(key => {
      if (attributes.indexOf(key) !== -1) {
        result.filter = result.filter || {};
        result.filter[key] = args[key];
      }

      // Limit arg
      if (key === 'offset' && args[key]) {
        result.offset = parseInt(args[key], 10);
      }

      if (key === 'skip' && args[key]) {
        result.index = parseInt(args[key], 10);
      }

      if (key === 'order' && args[key]) {
        if (args[key].indexOf('reverse:') === 0) {
          result.order = [args[key].substring(8), 'DESC'];
        } else {
          result.order = [args[key], 'ASC'];
        }
      }
    });

    const maxLimit = opts.maxLimit;

    if (maxLimit) {
      if (!result.offset) {
        result.offset = maxLimit;
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
export function buildQuery(seq, args, thinky) {
  let Query = seq;

  // Developer can overwrite query per node
  if (typeof args.query === 'function') {
    Query = args.query(seq, args, thinky);
  } else {
    if (args.filter && Object.keys(args.filter).length > 0) {
      Object.keys(args.filter).forEach(fieldName => {
        if (isFunction(args.filter[fieldName])) {
          Query = Query.filter(args.filter[fieldName]);
          delete args.filter[fieldName];
        }
      });

      Query = Query.filter(args.filter);
    }

    if (args.order && args.order[1] === 'DESC') {
      Query = Query.orderBy(thinky.r.desc((args.order[0])));
    } else if (args.order && args.order[0]) {
      Query = Query.orderBy(args.order[0]);
    }

    if (args.offset) {
      Query = Query.slice(args.index, args.offset);
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
export function buildCount(model,relatedIds,FK,opts) {
  const thinky = model._thinky;
  const r = thinky.r;
  opts.offset = false;

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