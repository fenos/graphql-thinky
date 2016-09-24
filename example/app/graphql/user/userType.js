import GraphQLThinky from '../graphql-thinky';
import {
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';

const { resolve, connect, connectTypeDefinition } = GraphQLThinky;

import TodoType from '../todo/todoType';

export default GraphQLThinky.createModelType('user', {
  globalId: true,
  fields: () => ({
    todosDataloader: {
      args: {
        limit: {
          type: GraphQLInt,
        },
        completed: {
          type: GraphQLBoolean,
        },
      },
      type: new GraphQLList(TodoType),
      resolve: (user, { limit, completed }, { loaders }) => {
        return loaders.user.related('todos', user.id, (loaderFilter) => {
          return loaderFilter.limit(limit)
            .if(completed, (loaderFilter) => loaderFilter.filter({ completed }))
            .resolve();
        });
      }
    },
    todosJoin: {
      args: {
        limit: {
          type: GraphQLInt,
        },
        completed: {
          type: GraphQLBoolean,
        },
      },
      type: new GraphQLList(TodoType),
      resolve: resolve('user', 'todos'),
    },
    todosConnectionDataloader: {
      ...connectTypeDefinition(TodoType, {
        completed: {
          type: GraphQLBoolean,
        }
      }),
      resolve: (user, args, { loaders }) => {
        const { completed } = args;
        return loaders.user.related('todos', user.id, (loaderFilter) => {
          return loaderFilter.if(completed, (loaderFilter) => loaderFilter.filter({ completed }))
            .connection(args);
        });
      }
    },
    todosConnection: {
      ...connect('user', 'todos', {
        connection: {
          name: 'UserTodoConnection',
          type: TodoType
        }
      })
    }
  })
});