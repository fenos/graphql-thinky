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
    resolve: resolve('post'),
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