import GraphQLThinky from '../graphql-thinky';
import {
  GraphQLInt,
  GraphQLList,
} from 'graphql';
import CommentType from '../comment/commentType';
const { resolve, commonArgs } = GraphQLThinky;

export default GraphQLThinky.createModelType('post', {
  globalId: true,
  fields: () => ({
    fullCount: {
      type: GraphQLInt
    },
    comments: {
      type: new GraphQLList(CommentType),
      args: {
        ...commonArgs,
      },
      resolve: resolve('post','comments')
    }
  })
});