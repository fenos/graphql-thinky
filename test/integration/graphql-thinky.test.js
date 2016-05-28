import test from 'ava';
import {expect} from 'chai';
import {DB,graphql as Graph} from './../helpers';
import GraphqlThinky from './../../src/index';
import {
    graphql,
    GraphQLList,
    GraphQLInt,
    GraphQLString,
    GraphQLEnumType,
    GraphQLNonNull
} from 'graphql';
import _ from 'lodash';


test.beforeEach(async function(t) {

  t.context.graphqlThinky = new GraphqlThinky(DB);
  
  const users = t.context.users = await DB.models.User.save([
    {name: 'jhon',username: 'doe'},
    {name: 'fabri',username: 'fenos'},
    {name: 'will',username: 'red'},
    {name: 'smith',username: 'blue'},
    {name: 'paul',username: 'orange'},
    {name: 'tesla',username: 'ele'},
  ]);

  const tasks = [];
  users.forEach((user,key) => {
    tasks.push({
      title: 'My task'+key,
      number: key,
      description: 'My duty'+key,
      assignee_id: user.id
    });
  });

  return t.context.tasks = await DB.models.Task.save(tasks);
});

test.afterEach(async (t) => {
  return await DB.clearDB();
});

test.after('cleanup' ,async function() {
  await DB.dropDB();
  return await DB.instance.r.getPool().drain();
});

test.serial('it return a list of users', async () => {
  
})