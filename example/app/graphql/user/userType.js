import GraphQLThinky from '../graphql-thinky';
import {
    GraphQLInt,
    GraphQLList
} from 'graphql';

const { resolve, connect } = GraphQLThinky;

import TodoType from '../todo/todoType';

export default GraphQLThinky.createModelType('user', {
  globalId: true,
  fields: () => ({
    todos: {
      type: new GraphQLList(TodoType),
      resolve: resolve('user','todos')
    },
    todosConnection: {
      ...connect('user','todos', {
        connection: {
          name: 'UserTodoConnection',
          type: TodoType
        }
      })
    }
  })
});