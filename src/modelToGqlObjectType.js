import _ from 'lodash';
import {GraphQLObjectType} from 'graphql';
import {toGraphQLDefinition} from './typeMapper';

/**
 * Create a GraphQLObjectType from a
 * a thinky model
 *
 * @param Model
 * @param fields
 * @param options
 */
export default function (Model, options = {}) {
  const GraphQLDefinition = toGraphQLDefinition(Model, {
    exclude: options.exclude,
    only: options.only,
    map: options.map,
    globalId: options.globalId,
    allowNull: options.allowNull
  });

  return new GraphQLObjectType({
    name: _.upperFirst(Model._schema._model._name),
    fields: () => {
      const fieldDef = {
        ...GraphQLDefinition
      };

      if (typeof options.fields === 'function') {
        Object.assign(fieldDef, options.fields());
      } else if (typeof options.fields === 'object') {
        Object.assign(fieldDef, options.fields);
      }

      return fieldDef;
    },
    interfaces: () => options.interfaces || []
  });
}
