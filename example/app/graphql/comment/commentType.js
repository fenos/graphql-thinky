import GraphQLThinky from '../graphql-thinky';
import {
  GraphQLInt
} from 'graphql';
import PostType from '../post/postType';
const { resolve } = GraphQLThinky;

export default GraphQLThinky.createModelType('comment', {
  globalId: true,
  fields: () => ({
    fullCount: {
      type: GraphQLInt
    },
    post: {
      type: PostType,
      resolve: resolve('comment','post')
    }
  })
});