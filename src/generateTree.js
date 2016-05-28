import BaseNode from './Node';
import thinkySchema from 'thinky-export-schema';
import {argsToFindOptions} from './queryBuilder';
import {isConnection, nodeAST, nodeType} from './relay';
import _ from 'lodash';
import {
    GraphQLList
} from 'graphql';

function inList(list, attribute) {
  return ~list.indexOf(attribute);
}

/**
 * Create a tree
 *
 * @param simpleAST
 * @param type
 * @param context
 * @returns {{}}
 */
export default function generateTree(simpleAST, type, context,opts) {

  const result = {};

  type = type.ofType || type;

  Object.keys(simpleAST.fields).forEach(function (key) {

    let fieldAST = simpleAST.fields[key]
        , name = fieldAST.key || key
        , fieldType = type._fields[name] && type._fields[name].type
        , args = fieldAST.args
        , includeResolver = type._fields[name].resolve;

    // No point continue is no resolve or $Node not found on the resolver
    if (!includeResolver || (includeResolver && !includeResolver.$Node)) return;

    if (isConnection(fieldType)) {
      fieldAST = nodeAST(fieldAST);
      fieldType = nodeType(fieldType);
    }

    // No point inncluding if no fields have been asked for
    if (!fieldAST) return;

    const resolverNode = includeResolver.$Node,
          params = {};
    
    Object.keys(resolverNode).forEach((key) => {
      params[key] = resolverNode[key];
    });

    // To Prevent further Circular
    // reference i'll re-construct the object
    // on the tree
    const Node      = new BaseNode(params);
    Node.name       = Node.name || name;

    let includeOptions = argsToFindOptions(args, Node.getModel());

    if (Node.isRelated()) {

      const Related = Node.related;
      const Model = Related.model;
      const modelSchema = thinkySchema(Model);
      const allowedAttributes = Object.keys(modelSchema.fields);

      includeOptions.attributes = (includeOptions.attributes || [])
          .concat(Object.keys(fieldAST.fields).map(key => fieldAST.fields[key].key || key))
          .filter(inList.bind(null, allowedAttributes));


      if (includeResolver.$before) {

        includeOptions = includeResolver.$before(includeOptions, args, context, {
          ast: fieldAST,
          type: type
        });
      }

      if (Related.type === 'hasMany') {
        includeOptions.attributes.push(Related.rightKey);
      } else {
        includeOptions.attributes.push(Related.leftKey);
      }

      const nestedNode = generateTree(
          fieldAST,
          fieldType,
          context
      );

      const hasNestedNode = Object.keys(nestedNode).length > 0;

      if (hasNestedNode) {
        includeOptions.attributes = _.uniq(includeOptions.attributes);
        Node.appendToTree(nestedNode);
      }

      includeOptions.list = fieldType.typeOf || fieldType instanceof GraphQLList;
      Node.setArgs(includeOptions);

      result[Node.name] = Node;
    }
  });

  return result;
};