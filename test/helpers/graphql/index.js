import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  graphql,
} from 'graphql';

import loaders from './loaders';

/**
 *
 * Generate Schema
 *
 * @param fields
 */
function createSchema(fields,node) {

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: {
          ...fields
      }
    }),
    node: node
  });
}

/**
 * User type
 *
 * @param fields
 */
function userType(fields, name, nodeInterface) {
  return  new GraphQLObjectType({
    name: name || 'User',
    description: 'A user',
    fields: {
      id: {
        type: new GraphQLNonNull(GraphQLString),
      },
      name: {
        type: GraphQLString,
      },
      username: {
        type: GraphQLString
      },
      virtualName: {
        type: GraphQLString
      },
      ...fields
    },
    interfaces: () => nodeInterface || []
  });
}

/**
 * Task Type
 *
 * @param fields
 */
export  function taskType(fields,nodeInterface) {
  return  new GraphQLObjectType({
    name: 'Task',
    description: 'A Task',
    fields: () => {

      if (typeof fields === 'function') {
        fields = fields();
      }

      return {
        id: {
          type: new GraphQLNonNull(GraphQLString),
        },
        title: {
          type: GraphQLString,
        },
        description: {
          type: GraphQLString
        },
        assignee_id: {
          type: new GraphQLNonNull(GraphQLString)
        },
        ...fields
      }
    },
    interfaces: () => nodeInterface || []
  });
}

/**
 * Tag type
 *
 * @param fields
 */
export function tagType(fields, nodeInterface) {

  return  new GraphQLObjectType({
    name: 'Tag',
    description: 'A Tag',
    fields: () => {
      if (typeof fields === 'function') {
        fields = fields();
      }

      return {
        id: {
          type: new GraphQLNonNull(GraphQLString),
        }
        ,
        name: {
          type: GraphQLString,
        },
        description: {
          type: GraphQLString
        },
        ...fields
      }
    },
    interfaces: () => nodeInterface || []
  });
}

export function executeQuery(schema,query) {
  return graphql(schema,query,null,{loaders});
}

export default {
  createSchema,
  userType,
  taskType,
  tagType,
  executeQuery
}