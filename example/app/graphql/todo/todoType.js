import GraphQLThinky from '../graphql-thinky';
import UserType from './../user/userType';

const { resolve } = GraphQLThinky;

export default GraphQLThinky.createModelType('todo', {
  globalId: true,
  fields: () => ({
    user: {
      type: UserType,
      resolve: resolve('todo','user')
    }
  })
});