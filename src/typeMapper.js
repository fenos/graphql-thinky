import {
    GraphQLInt,
    GraphQLString,
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLList,
    GraphQLObjectType,
    GraphQLNonNull
} from 'graphql';

import {globalIdField} from 'graphql-relay';
import {type} from 'thinky';
import _ from 'lodash';

let customTypeMapper;

/**
 * A function to set a custom mapping of types
 * @param {Function} mapFunc
 */
export function mapType(mapFunc) {
  customTypeMapper = mapFunc;
}

/**
 * Create a graphql definition based to a
 * thinky model
 *
 * @param thinkyModel
 * @returns {*}
 */
export function toGraphQLDefinition(thinkyModel, opts = {}) {
  opts.exclude = opts.exclude || [];
  opts.only = opts.only || null;
  opts.map = opts.map || {};
  opts.globalId = (opts.globalId === undefined) ? false : opts.globalId;
  opts.allowNull = (opts.allowNull === undefined) ? true : opts.allowNull;

  const modelSchema = thinkyModel._schema._schema,
    modelDef = thinkyModel._schema._model,
    modelName = modelDef._name;

  // Generate the GraphQL Definition Object
  const graphQLDefinition = Object.keys(modelSchema).reduce((gqlDef, key) => {
    // Skip Excluded
    if (opts.exclude.indexOf(key) !== -1) {
      return gqlDef;
    }

    // Only those fields
    if (opts.only && opts.only.indexOf(key) === -1) {
      return gqlDef;
    }

    const modelType = modelSchema[key];
    const name = (type.isObject(modelType)) ? _.upperFirst(modelDef._name) + _.upperFirst(key) : key;
    const graphQLType = attributeToGraphQLType(modelType, name);

    if (graphQLType) {
      // Map the field if specified
      if (opts.map.hasOwnProperty(key)) {
        if (typeof opts.map === 'function') {
          key = opts.map(key);
        } else {
          key = opts.map[key];
        }
      }

      // If the attribute is a "not nullable" field, then i'll wrap it
      // with a GraphQLNotNull instance
      if (opts.allowNull && modelType._options.enforce_type === 'strict') {
        gqlDef[key] = {
          type: new GraphQLNonNull(graphQLType)
        };
      } else {
        gqlDef[key] = {
          type: graphQLType
        };
      }
    }

    return gqlDef;
  }, {});

  // Add relay global id if requested
  if (opts.globalId) {
    const field = `${modelName.toLowerCase()}ID`;
    graphQLDefinition.id = globalIdField(modelName, instance => instance.id);
    graphQLDefinition[field] = {
      type: GraphQLString,
      resolve: source => {
        return source.id;
      }
    };
  } else {
    graphQLDefinition.id = {
      type: GraphQLString
    };
  }

  return graphQLDefinition;
}

/**
 * Accept a thinky type and return
 * a graphQL Type
 *
 * @param attributeType
 * @param name
 */
export function attributeToGraphQLType(attributeType, name) {
  const schema = attributeType._schema,
    schemaKeys = schema ? Object.keys(schema) : [],
    enumKeys = (attributeType._enum) ? Object.keys(attributeType._enum) : [];

  // User did create a custom type mapper
  // return it if it is truthy
  if (customTypeMapper) {
    const result = customTypeMapper(attributeType);
    if (result) {
      return result;
    }
  }

  // ENUM type
  if (enumKeys.length > 0) {
    const specialChars = /[^a-z\d_]/i;

    return new GraphQLEnumType({
      name: `${name}EnumType`,
      values: enumKeys.reduce((obj, enumKey) => {
        const value = enumKey;
        let sanitizedValue = value;
        if (specialChars.test(value)) {
          sanitizedValue = value.split(specialChars).reduce((reduced, val, idx) => {
            let newVal = val;
            if (idx > 0) {
              newVal = `${val[0].toUpperCase()}${val.slice(1)}`;
            }
            return `${reduced}${newVal}`;
          });
        }
        obj[sanitizedValue] = {value};
        return obj;
      }, {})
    });
  }

  // Bolean Type
  if (type.isBoolean(attributeType)) {
    return GraphQLBoolean;
  }

  // String Type
  if (type.isString(attributeType) ||
      type.isDate(attributeType) ||
      type.isPoint(attributeType)) {
    return GraphQLString;
  }

  // Number Type TODO: what about if it is float?
  if (type.isNumber(attributeType)) {
    return GraphQLInt;
  }

  // Object type
  if (type.isObject(attributeType)) {
    if (schemaKeys.length === 0) {
      console.info('Attrbute type object doesnt have a schema, skip...');
      return;
    }

    const graphQLTypeDef = {};
    schemaKeys.forEach(attribute => {
      graphQLTypeDef[attribute] = {};

      const graphQLType = attributeToGraphQLType(schema[attribute], name);

      if (graphQLType) {
        graphQLTypeDef[attribute]['type'] = graphQLType;
      }
    });

    if (!name) {
      throw new Error('Specify a name for the Object Attribute type');
    }

    return new GraphQLObjectType({
      name: _.upperFirst(name),
      fields: {
        ...graphQLTypeDef
      }
    });
  }

  // Array type
  if (type.isArray(attributeType)) {
    const schemaArray = attributeType._schema;
    const arrayType = attributeToGraphQLType(schemaArray, name);
    return new GraphQLList(arrayType);
  }
}
