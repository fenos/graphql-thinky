import GraphQLThinky from '../graphql-thinky';
import UserType from './../user/userType';

const { resolve } = GraphQLThinky;

export default GraphQLThinky.createModelType('todo', {
  globalId: true,
  fields: () => ({
    user: {
      type: UserType,
      resolve: (todo, args, { loaders }) => {
        // console.log("TPP",todo);
        return loaders.user.loadById(todo.user_id);
      }
    }
  })
});