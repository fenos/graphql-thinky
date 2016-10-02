import {uniq} from 'lodash';
import thinkySchema from 'thinky-export-schema';
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
  const modelSchema = thinkySchema(Model);
  const modelRelations = Object.keys(modelSchema.relationships);

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
    let fields = simplyAST.fields;
    let type = info.returnType;

    const connection = isConnection(info.returnType);
    if (connection) {
      simplyAST = nodeAST(simplyAST);
      fields = simplyAST.fields;
      type = nodeType(type);
    }

    const findOptions:NodeAttributes = argsToFindOptions(args, Model, opts);

    let nodeArgs:NodeAttributes = {
      list: Boolean(type instanceof GraphQLList || connection),
      filterQuery: false,
      attributes: [],
      filter: {},
      index: 0,
      offset: opts.maxLimit || 100,
      skip: undefined,
      order: undefined,
      count: undefined,
      ...opts,
      ...findOptions
    };

    // Before Resolve is triggered, good for permission checks
    // and manipulating query exec
    nodeArgs = await before(nodeArgs,source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });

    nodeArgs.attributes = uniq(Object.keys(fields).filter(field => {
      return (modelRelations.indexOf(field) === -1) &&
          modelSchema.fields.hasOwnProperty(field) &&
          modelSchema.fields[field] !== 'Virtual';
    }).concat(['id']).concat(opts.attributes || []));

    type = type.ofType || type;
    Node.appendArgs(nodeArgs);

    const result = await Node.resolve(source,context || {});

    return await after(result,source, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });
  };

  return Resolver;
}
