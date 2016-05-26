import {
    GraphQLList,
    GraphQLString
} from 'graphql';

import UserType from './userType';
import GraphQLThinky from '../graphql-thinky';

const { resolve, connect } = GraphQLThinky;

export default {
  users: {
    args: {
      name: {
        type: GraphQLString
      }
    },
    type: new GraphQLList(UserType),
    resolve: resolve('user')
  },
  user: {
    type: UserType,
    args: {
      id: {
        type: GraphQLString
      }
    },
    resolve: resolve('user')
  },
  usersConnection: {
    ...connect('user', null, {
      connection: {
        name: 'UserConnection',
        type: UserType
      }
    })
  }
}