import _ from 'lodash';
import {connectionDefinitions, connectionArgs} from 'graphql-relay';
import {GraphQLEnumType, GraphQLList} from 'graphql';
import simplifyAST from '../simplifyAst';
import LoaderFilter from '../dataloader/loaderFilter';
import {NodeAttributes} from '../node';
import {base64, unbase64} from './../base64.js';

const cursorSeparator = '$',
  cursorPrefix = `arrayconnection${cursorSeparator}`;

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
}

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
  if (queriedCursor) {
    startIndex = Number(queriedCursor.index);
  }
  if (startIndex !== 0) {
    startIndex++;
  }
  return {
    cursor: toCursor(item, index + startIndex),
    node: item,
    source
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
      resultset[0].fullCount &&
      parseInt(resultset[0].fullCount, 10);

  if (!resultset[0]) {
    fullCount = 0;
  }

  let hasMorePages = false;
  let hasPreviousPage = false;

  if (limit) {
    const index = cursor ? Number(cursor.index) : 0;
    const perPage = parseInt(limit, 10);
    const requested = (index + 1) * perPage;

    hasMorePages = requested < fullCount;
    hasPreviousPage = (requested > perPage);
  }
  return {
    hasMorePages,
    hasPreviousPage
  };
}
/**
 * Resolve a relay connection
 *
 * @param Node
 * @returns {{connectionType, edgeType, nodeType: *, resolveEdge: resolveEdge, connectionArgs: {orderBy: {type}}, resolve: resolver}}
 */
export default (Node,resolveOpts) => {
  const connectionOpts = Node.connection,
    connectionName = connectionOpts.name,
    nodeType = connectionOpts.type,
    userParms = connectionOpts.params || {};

  connectionOpts.before = connectionOpts.before || (options => options);
  connectionOpts.after = connectionOpts.after || (options => options);

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
      name: `${connectionName}ConnectionOrder`,
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
    ...resolveOpts,
    list: true,
    handleConnection: false,
    thinky: Node.thinky,
    before: (options:NodeAttributes,parent, args, context) => {
      if (args.first || args.last) {
        const offset = parseInt(args.first || args.last, 10);

        if (options.count === undefined) {
          options.count = true;
        }

        if (args.before || args.after) {
          const cursor = fromCursor(args.after || args.before);
          const startIndex = Number(cursor.index);
          options.offset = offset + startIndex;
          options.index = startIndex;
        } else {
          options.offset = offset;
          options.index = 0;
        }
      }

      //
      // // attach the order into the composition
      // // stack
      // let order;
      // if (!args.orderBy) {
      //   order = [orderByEnum._values[0].value];
      // } else if (typeof args.orderBy === 'string') {
      //   order = [orderByEnum._nameLookup[args.orderBy].value];
      // } else {
      //   order = args.orderBy;
      // }
      //
      // const orderAttribute = order[0][0]; // Order Attribute
      // let orderDirection = order[0][1]; // Order Direction
      //
      // // Depending on the direction requested
      // // we sort the result accordently
      // if (args.last) {
      //   orderDirection = orderDirection === 'ASC' ? 'DESC' : 'ASC';
      // }
      //
      // // Assign order
      // options.order = [
      //   orderAttribute, orderDirection
      // ];
      //
      // options.relations = [];
      // options.attributes = _.uniq(options.attributes);

      return connectionOpts.before(options, args, root, context);
    },
    after: (resultset, parent, args, root, {source}) => {

      if (resultset instanceof LoaderFilter) {
        resultset = resultset.toArray();
      }

      let cursor = null;

      // Once we have the result set we decode the cursor
      // if given
      if (args.after || args.before) {
        cursor = fromCursor(args.after || args.before);
      }

      // create edges array
      const edges = resultset.map((value, idx) => {
        return resolveEdge(value, idx, cursor, args, source);
      });

      const firstEdge = edges[0],
        lastEdge = edges[edges.length - 1];

      const edgeInfo = createEdgeInfo(resultset, args.first || args.last, cursor);
      const {hasMorePages, hasPreviousPage} = edgeInfo;

      return {
        source,
        args,
        edges,
        pageInfo: {
          startCursor: firstEdge ? firstEdge.cursor : null,
          endCursor: lastEdge ? lastEdge.cursor : null,
          hasPreviousPage,
          hasNextPage: hasMorePages
        }
      };
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

  return {
    connectionType,
    edgeType,
    nodeType,
    resolveEdge,
    connectionArgs: $connectionArgs,
    resolve: resolver
  };
};
