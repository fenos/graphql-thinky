import GraphqlThinky from './../graphql-thinky';
import CommentType from './commentType';
import {GraphQLList} from 'graphql';

const { resolve, connect, commonArgs } = GraphqlThinky;

export default {
  
  comments: {
    type: new GraphQLList(CommentType),
    args: {
      ...commonArgs,
    },
    resolve: resolve('comment')
  },

  commentsConnection: {
    ...connect('comment', null, {
      connection: {
        name: 'CommentConnection',
        type: CommentType
      }
    })
  }
}