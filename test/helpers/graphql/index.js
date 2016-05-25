import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
    GraphQLString
} from 'graphql';

/**
 *
 * Generate Schema
 *
 * @param fields
 */
function createSchema(fields) {

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: {
          ...fields
      }
    })
  });
}

/**
 * User type
 *
 * @param fields
 */
function userType(fields, name) {
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
    }
  });
}

/**
 * Task Type
 *
 * @param fields
 */
export  function taskType(fields) {
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
    }
  });
}

/**
 * Tag type
 *
 * @param fields
 */
export function tagType(fields) {

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
    }
  });
}

export default {
  createSchema,
  userType,
  taskType,
  tagType
}