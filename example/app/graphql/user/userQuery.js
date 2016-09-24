import {
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql';

import UserType from './userType';
import GraphQLThinky from '../graphql-thinky';

const { resolve, connect } = GraphQLThinky;

export default {
  /**
   * User query
   */
  users: {
    args: {
      name: {
        type: GraphQLString
      }
    },
    type: new GraphQLList(UserType),
    resolve: resolve('user'),
  },
  user: {
    type: UserType,
    args: {
      name: {
        type: new GraphQLNonNull(GraphQLString)
      }
    },
    resolve: (_, { name }, { loaders }) => {
      return loaders.user.loadBy('name', name);
    }
  },

  /**
   * User Connection query,
   * it use relay spec
   */
  usersConnection: {
    ...connect('user', null, {
      args: {
        name: {
          type: GraphQLString
        }
      },
      connection: {
        name: 'UserConnection',
        type: UserType
      }
    })
  }
}