import GraphqlThinky from './../graphql-thinky';
import TodoType from './todoType';
import {GraphQLList} from 'graphql';

const { resolve, connect } = GraphqlThinky;

export default {
  
  todos: {
    type: new GraphQLList(TodoType),
    resolve: resolve('todo')
  },

  todosConnection: {
    ...connect('todo', null, {
      connection: {
        name: 'TodoConnection',
        type: TodoType
      }
    })
  }
}