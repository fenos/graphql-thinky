import _ from 'lodash';
import simplifyAST from './../simplifyAST';
import {
    connectionDefinitions,
    connectionArgs
} from 'graphql-relay';

import {
    GraphQLEnumType,
    GraphQLList
} from  'graphql';

import {
    base64,
    unbase64,
} from './../base64.js';


const cursorSeparator = '$',
      cursorPrefix = 'arrayconnection' + cursorSeparator;

/**
 * Creates a cursor based on the item and the
 * index of where is located on the result set.
 * needed to identify edges
 *
 * @param item
 * @param index
 * @returns {*}
 */
function toCursor(item, index) {
  const id = item.id;
  return base64(cursorPrefix + id + cursorSeparator + index);
}

/**
 * Decode a cursor into its component parts
 *
 * @param cursor
 * @returns {{id, index}}
 */
function fromCursor(cursor) {
  cursor = unbase64(cursor);
  cursor = cursor.substring(cursorPrefix.length, cursor.length);
  const [id, index] = cursor.split(cursorSeparator);

  return {
    id,
    index
  };
};

/**
 * Resolve an edge within it's
 * cursor, node and source
 *
 * @param item
 * @param index
 * @param queriedCursor
 * @param args
 * @param source
 * @returns {{cursor: *, node: *, source: *}}
 */
function resolveEdge(item, index, queriedCursor, args = {}, source) {
  let startIndex = 0;
  if (queriedCursor) startIndex = Number(queriedCursor.index);
  if (startIndex !== 0) startIndex++;
  return {
    cursor: toCursor(item, index + startIndex),
    node: item,
    source: source
  };
}

/**
 * Return location information
 * of an edge
 *
 * @param resultset
 * @param limit
 * @param cursor
 * @returns {{hasMorePages: boolean, hasPreviousPage: boolean}}
 */
function createEdgeInfo(resultset, limit, cursor) {

  // retrieve full count from the first edge
  // or default 10
  let fullCount = resultset[0] &&
      resultset[0].full_count &&
      parseInt(resultset[0].full_count, 10);

  if (!resultset[0]) fullCount = 0;

  let hasMorePages = false;
  let hasPreviousPage = false;

  if (limit) {
    let index = cursor ? Number(cursor.index) : 0;
    let perPage = parseInt(limit, 10);
    const requested = (index + 1) * perPage;

    hasMorePages = requested < fullCount;
    hasPreviousPage = (requested > perPage);
  }
  return {
    hasMorePages: hasMorePages,
    hasPreviousPage: hasPreviousPage };
}
/**
 * Resolve a relay connection
 *
 * @param Node
 * @returns {{connectionType, edgeType, nodeType: *, resolveEdge: resolveEdge, connectionArgs: {orderBy: {type}}, resolve: resolver}}
 */
export default (Node) => {

  const connectionOpts = Node.connection,
      connectionName = connectionOpts.name,
      nodeType = connectionOpts.type,
      userParms = connectionOpts.params || {};

  connectionOpts.before = connectionOpts.before || ((options) => options);
  connectionOpts.after = connectionOpts.after || ((options) => options);

  const {
      edgeType,
      connectionType
  } = connectionDefinitions({
    nodeType,
    name: connectionName,
    connectionFields: connectionOpts.connectionFields,
    edgeFields: connectionOpts.edgeFields
  });

  // Define the order of the connection
  // To have always a guranteed set of data
  // (if not provided)
  let orderByEnum;
  if (userParms.orderBy === undefined) {
    orderByEnum = new GraphQLEnumType({
      name: connectionName + 'ConnectionOrder',
      values: {
        ID: {value: ['id', 'ASC']}
      }
    });
  } else {
    orderByEnum = userParms.orderBy;
  }
  
  // Assign the connection arguments
  const $connectionArgs = {
    ...connectionArgs,
    orderBy: {
      type: new GraphQLList(orderByEnum)
    }
  };

  // We are going to give instruction on how
  // the resolver has to retrieve information from
  // rethink, then returning it with in the edges,node pattern.
  const $resolver = require('./../resolver').default(Node, {
    list: true,
    handleConnection: false,
    thinky: Node.thinky,
    before: (options, args, context) => {

      // We prepare to paginate the result set,
      // because fist or last has been requested
      if (args.first || args.last) {
        options.limit = parseInt(args.first || args.last, 10);
        options.count = true; // count result set

        if (args.after || args.before) {
          const cursor = fromCursor(args.after || args.before);
          const startIndex = Number(cursor.index);

          //TODO: Limitation we can't paginate 1 result at the time
          if (startIndex > 0) options.offset = startIndex + 1;
        }
      }

      // attach the order into the composition
      // stack
      let order;
      if (!args.orderBy) {
        order = [orderByEnum._values[0].value];
      } else if (typeof args.orderBy === 'string') {
        order = [orderByEnum._nameLookup[args.orderBy].value];
      } else {
        order = args.orderBy;
      }
      
      let orderAttribute = order[0][0]; // Order Attribute
      let orderDirection = order[0][1]; // Order Direction

      // Depending on the direction requested
      // we sort the result accordently
      if (args.last) {
        orderDirection = orderDirection === 'ASC' ? 'DESC' : 'ASC';
      }

      // Assign order
      options.order = [
        orderAttribute, orderDirection
      ];

      options.relations = [];
      options.attributes = _.uniq(options.attributes);

      return connectionOpts.before(options, args, root, context);

    },
    after: function (resultset, args, root, {source}) {
      let cursor = null;

      // Once we have the result set we decode the cursor
      // if given
      if (args.after || args.before) {
        cursor = fromCursor(args.after || args.before);
      }

      // create edges array
      let edges = resultset.map((value, idx) => {
        return resolveEdge(value, idx, cursor, args, source);
      });

      const firstEdge = edges[0],
            lastEdge = edges[edges.length - 1];

      const edgeInfo = createEdgeInfo(resultset, args.first || args.last, cursor);

      var hasMorePages = edgeInfo.hasMorePages;
      var hasPreviousPage = edgeInfo.hasPreviousPage;

      return {
        source,
        args,
        edges,
        pageInfo: {
          startCursor: firstEdge ? firstEdge.cursor : null,
          endCursor: lastEdge ? lastEdge.cursor : null,
          hasPreviousPage: hasPreviousPage,
          hasNextPage: hasMorePages
        }
      }
    }
  });

  // Create a wrapper around our custom resolver
  // So that it will be executed only if edges are
  // returned.
  const resolver = (source, args, context, info) => {
    if (simplifyAST(info.fieldASTs[0], info).fields.edges) {
      return $resolver(source, args, context, info);
    }

    return {
      source,
      args
    };
  };

  resolver.$Node = $resolver.$Node;
  resolver.$before = $resolver.$before;
  resolver.$after = $resolver.$after;
  resolver.$options = $resolver.$options;

  return {
    connectionType,
    edgeType,
    nodeType,
    resolveEdge,
    connectionArgs: $connectionArgs,
    resolve: resolver
  };
}