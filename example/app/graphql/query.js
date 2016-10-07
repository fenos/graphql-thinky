import {
    GraphQLObjectType,
} from 'graphql';

import userQuery from './user/userQuery';
import todoQuery from './todo/todoQuery';
import authorQuery from './author/authorQuery';
import postQuery from './post/postQuery';
import GraphqlThinky from './graphql-thinky';

export default new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    ...userQuery,
    ...todoQuery,
    ...authorQuery,
    ...postQuery,
    node: GraphqlThinky.nodeField
  })
});