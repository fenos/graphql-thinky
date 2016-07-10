import thinkySchema from 'thinky-export-schema';
import {GraphQLList} from 'graphql';
import _ from 'lodash';
import BaseNode from './node';
import {argsToFindOptions} from './queryBuilder';
import {isConnection, nodeAST, nodeType} from './relay';

function inList(list, attribute) {
  return list.indexOf(attribute) !== -1;
}

/**
 * Create a tree
 *
 * @param simpleAST
 * @param type
 * @param context
 * @param opts
 * @returns <Promise>
 */
export default function generateTree(simpleAST, type, context, opts = {}) {
  const result = {};

  type = type.ofType || type;

  return Promise.all(Object.keys(simpleAST.fields).map(key => {
    let fieldAST = simpleAST.fields[key],
      name = fieldAST.key || key, // eslint-disable-line prefer-const
      fieldType = type._fields[name] && type._fields[name].type;

    const args = fieldAST.args;
    const includeResolver = type._fields[name].resolve;

    // No point continue is no resolve or $Node not found on the resolver
    if (!includeResolver || (includeResolver && !includeResolver.$Node)) {
      return null;
    }

    if (isConnection(fieldType)) {
      fieldAST = nodeAST(fieldAST);
      fieldType = nodeType(fieldType);
    }

    // No point inncluding if no fields have been asked for
    if (!fieldAST) {
      return null;
    }

    const resolverNode = includeResolver.$Node,
      resolverOpts = includeResolver.$options,
      params = {};

    Object.keys(resolverNode).forEach(key => {
      params[key] = resolverNode[key];
    });

    // To Prevent further Circular
    // reference i'll re-construct the object
    // on the tree
    const Node = new BaseNode(params);
    Node.name = Node.name || name;

    let includeOptions = argsToFindOptions(args, Node.getModel(), {
      maxLimit: opts.maxLimit
    });

    if (Node.isRelated()) {
      const Related = Node.related;
      const Model = Related.model;
      const modelSchema = thinkySchema(Model);
      const allowedAttributes = Object.keys(modelSchema.fields);

      includeOptions.attributes = (includeOptions.attributes || [])
          .concat(Object.keys(fieldAST.fields).map(key => fieldAST.fields[key].key || key))
          .filter(inList.bind(null, allowedAttributes))
          .concat(resolverOpts.defaultAttributes || []); // merge default attributes

      if (Related.type === 'hasMany') {
        includeOptions.attributes.push(Related.rightKey);
      } else {
        includeOptions.attributes.push(Related.leftKey);
      }

      return Promise.resolve().then(() => {
        if (typeof includeResolver.$before === 'function') {
          includeOptions = includeResolver.$before(includeOptions, args, context, {
            ast: fieldAST,
            type
          });
        }

        return includeOptions;
      }).then(includeOptions => {
        return generateTree(
            fieldAST,
            fieldType,
            context,
            resolverOpts
        ).then(nestedNode => {
          const hasNestedNode = Object.keys(nestedNode).length > 0;

          if (hasNestedNode) {
            includeOptions.attributes = _.uniq(includeOptions.attributes);
            Node.appendToTree(nestedNode);
          }

          includeOptions.list = fieldType.typeOf || fieldType instanceof GraphQLList;
          Node.appendArgs(includeOptions);

          result[Node.name] = Node;
        });
      });
    }
    return null;
  })).then(() => {
    return result;
  });
}
