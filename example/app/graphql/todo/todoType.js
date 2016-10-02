import GraphQLThinky from '../graphql-thinky';
import UserType from './../user/userType';
import {
  GraphQLInt
} from 'graphql';

const { resolve } = GraphQLThinky;

export default GraphQLThinky.createModelType('todo', {
  globalId: true,
  fields: () => ({
    fullCount: {
      type: GraphQLInt
    },
    user: {
      type: UserType,
      resolve: resolve('todo','user')
    }
  })
});