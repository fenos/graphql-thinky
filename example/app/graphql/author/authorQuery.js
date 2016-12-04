import GraphqlThinky from './../graphql-thinky';
import AuthorType from './authorType';
import {GraphQLList} from 'graphql';

const { resolve, connect, commonArgs } = GraphqlThinky;
export default {
  
  authors: {
    type: new GraphQLList(AuthorType),
    args: {
      ...commonArgs,
    },
    resolve: resolve('author')
  },

  authorsConnection: {
    ...connect('author', null, {
      connection: {
        name: 'AuthorConnection',
        type: AuthorType
      }
    })
  }
}