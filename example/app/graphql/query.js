import {
    GraphQLObjectType,
} from 'graphql';

import userQuery from './user/userQuery';
import todoQuery from './todo/todoQuery';
import GraphqlThinky from './graphql-thinky';

export default new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    ...userQuery,
    ...todoQuery,

    node: GraphqlThinky.nodeField
  })
});