import {extend} from 'lodash';
import {GraphQLList, GraphQLNonNull} from 'graphql';
import simplifyAST from './simplifyAst';
import {argsToFindOptions} from './queryBuilder';
import {isConnection, nodeAST, nodeType} from './relay';

/**
 * Determine if the GQL node is a list
 * @param gqlTye
 * @returns {*}
 * @private
 */
function _isList(gqlTye) {
  if (gqlTye instanceof GraphQLList) {
    return true;
  }

  if (gqlTye instanceof GraphQLNonNull) {
    return _isList(gqlTye.ofType);
  }

  return false;
}

/**
 *
 * @param Node
 * @param opts
 * @returns {function(*=, *=, *=, *=)}
 */
export default function resolver(Node, {before, after, ...opts} = {}) {
  if (before === undefined) {
    before = async opts => opts;
  }
  if (after === undefined) {
    after = async opts => opts;
  }

  const Model = Node.getModel();

  /**
   * Resolver GraphQL
   *
   * @param source
   * @param args
   * @param context
   * @param info
   * @constructor
   */
  const Resolver = async(source, args, context, info) => {
    Node.name = Node.name || info.fieldName;

    let simplyAST = simplifyAST(info.fieldNodes[0], info);
    let requestedFields = simplyAST.fields;
    let type = info.returnType;

    const connection = isConnection(info.returnType);
    if (connection) {
      simplyAST = nodeAST(simplyAST);
      requestedFields = simplyAST.fields;
      type = nodeType(type);
    }

    const findOptions = argsToFindOptions(args, requestedFields, Model, opts);

    let nodeAttributes = extend({
      list: connection || _isList(type),
      filterQuery: true,
      requestedFields: false,
      attributes: [],
      filter: {},
      index: 0,
      offset: opts.maxLimit,
      skip: undefined,
      orderBy: undefined,
      count: undefined,
      ...findOptions
    }, opts);

    // Before Resolve is triggered, good for permission checks
    // and manipulating query exec
    nodeAttributes = await before(nodeAttributes, source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });

    type = type.ofType || type;
    Node.appendArgs(nodeAttributes);

    const result = await Node.resolve(source, context || {});

    return await after(result, nodeAttributes, source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });
  };

  return Resolver;
}
