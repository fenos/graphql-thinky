import _ from 'lodash';
import thinkySchema from 'thinky-export-schema';
import {GraphQLList} from 'graphql';
import simplifyAST from './simplifyAst';
import generateTree from './generateTree';
import {argsToFindOptions} from './queryBuilder';
import {isConnection, nodeAST, nodeType} from './relay';

/**
 * Resolver Constructor
 *
 * @param Node
 * @param opts
 * @returns {Resolver}
 */
export default function resolver(Node, opts = {}) {
  if (opts.before === undefined) {
    opts.before = async opts => opts;
  }
  if (opts.after === undefined) {
    opts.after = async opts => opts;
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
    const findOptions = argsToFindOptions(args, Model, {
      maxLimit: opts.maxLimit
    });

    let nodeArgs = {
      attributes: [],
      list: true,
      thinky: null,
      filter: {},
      limit: undefined,
      skip: undefined,
      order: undefined,
      ...findOptions
    };

    let fields = simplyAST.fields;
    let type = info.returnType;

    if (isConnection(info.returnType)) {
      simplyAST = nodeAST(simplyAST);
      fields = simplyAST.fields;
      type = nodeType(type);
    }

    nodeArgs = await opts.before(nodeArgs, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });

    nodeArgs.thinky = opts.thinky;
    nodeArgs.list = opts.list || type instanceof GraphQLList;
    nodeArgs.attributes = Object.keys(fields).filter(field => {
      return (modelRelations.indexOf(field) === -1) &&
          modelSchema.fields.hasOwnProperty(field) &&
          modelSchema.fields[field] !== 'Virtual';
    }).concat(['id']).concat(opts.defaultAttributes || []);

    type = type.ofType || type;

    if (!Node.isRelated()) {
      const tree = await generateTree(
          simplyAST,
          type,
          context,
          opts
      );

      Node.setTree(tree);

      if (opts.nestingLimit && Node.depthOfTree() > parseInt(opts.nestingLimit, 10)) {
        throw new Error('Nesting size not allowed');
      }

      Object.keys(tree).forEach(relationName => {
        const relation = tree[relationName].related;
        nodeArgs.attributes.push(relation.leftKey);
      });
    }

    nodeArgs.attributes = _.uniq(nodeArgs.attributes);
    Node.appendArgs(nodeArgs);

    const result = await Node.generateDataTree(source, opts.thinky);

    return await opts.after(result, args, context, {
      ...info,
      ast: simplyAST,
      type,
      source
    });
  };

  Resolver.$Node = Node;
  Resolver.$before = opts.before;
  Resolver.$after = opts.after;
  Resolver.$options = opts;

  return Resolver;
}
