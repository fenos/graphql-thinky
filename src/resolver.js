import {uniq, extend} from 'lodash';
import {GraphQLList} from 'graphql';
import simplifyAST from './simplifyAst';
import {argsToFindOptions} from './queryBuilder';
import {NodeAttributes} from './node';
import {isConnection, nodeAST, nodeType} from './relay';

export type ResolverOpts = {
  attributes?: Array<string>,
  maxLimit?: number,
  limit?: number,
  list: boolean,
  filter?: Object<FK,FV>,
  before?: func<NodeAttributes>,
  after?: func<any>,
}

/**
 *
 * @param Node
 * @param opts
 * @returns {function(*=, *=, *=, *=)}
 */
export default function resolver(Node, {before, after, ...opts}:ResolverOpts = {}) {
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

    let simplyAST = simplifyAST(info.fieldASTs[0], info);
    let requestedFields = simplyAST.fields;
    let type = info.returnType;

    const connection = isConnection(info.returnType);
    if (connection) {
      simplyAST = nodeAST(simplyAST);
      requestedFields = simplyAST.fields;
      type = nodeType(type);
    }

    const findOptions:NodeAttributes = argsToFindOptions(args,requestedFields, Model, opts);

    let nodeAttributes = extend({
      list: Boolean(type instanceof GraphQLList || connection),
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
    },opts);

    // Before Resolve is triggered, good for permission checks
    // and manipulating query exec
    nodeAttributes = await before(nodeAttributes,source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });

    type = type.ofType || type;
    Node.appendArgs(nodeAttributes);

    const result = await Node.resolve(source,context || {});

    return await after(result,nodeAttributes,source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });
  };

  return Resolver;
}
