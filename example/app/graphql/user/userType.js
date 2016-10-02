import GraphQLThinky from '../graphql-thinky';
import {
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';

const { resolve, connect } = GraphQLThinky;

import TodoType from '../todo/todoType';

export default GraphQLThinky.createModelType('user', {
  globalId: true,
  fields: () => ({
    fullCount: {
      type: GraphQLInt,
    },
    todos: {
      args: {
        offset: {
          type: GraphQLInt,
        },
        skip: {
          type: GraphQLInt,
        },
        completed: {
          type: GraphQLBoolean,
        },
      },
      type: new GraphQLList(TodoType),
      resolve: resolve('user','todos', {
        filterQuery: true,
      })
    },
    todosConnection: {
      ...connect('user','todos', {
        filterQuery: true,
        args: {
          completed: {
            type: GraphQLBoolean,
          }
        },
        connection: {
          name: 'UserTodo',
          type: TodoType
        },
      })
    }
  })
})
;