import GraphqlThinky from './../graphql-thinky';
import PostType from './postType';
import {GraphQLList} from 'graphql';

const { resolve, connect, commonArgs } = GraphqlThinky;

export default {
  
  posts: {
    type: new GraphQLList(PostType),
    args: {
      ...commonArgs,
    },
    resolve: (parent, args, context, info) => {
      return resolve('post')(parent, args, context, info);
    },
  },

  postsConnection: {
    ...connect('post', null, {
      connection: {
        name: 'PostConnection',
        type: PostType
      }
    })
  }
}