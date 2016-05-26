import {
    GraphQLObjectType,
} from 'graphql';

import userQuery from './user/userQuery';
import todoQuery from './todo/todoQuery';


export default new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    ...userQuery,
    ...todoQuery
  })
});