import GraphQLThinky from '../graphql-thinky';
import {
  GraphQLInt,
  GraphQLList
} from 'graphql';
import PostType from '../post/postType';
const { resolve, commonArgs } = GraphQLThinky;

export default GraphQLThinky.createModelType('author', {
  globalId: true,
  fields: () => ({
    fullCount: {
      type: GraphQLInt
    },
    posts: {
      type: new GraphQLList(PostType),
      args: {
        ...commonArgs,
      },
      resolve: resolve('author','posts')
    }
  })
});