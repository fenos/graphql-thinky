import test from 'ava';
import {expect} from 'chai';
import {DB, graphql as Graph} from './../helpers';
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


test.beforeEach(async function (t) {

  t.context.graphqlThinky = new GraphqlThinky(DB);

  const users = t.context.users = await DB.models.User.save([
    { name: 'jhon', username: 'doe' },
    { name: 'fabri', username: 'fenos' },
    { name: 'will', username: 'red' },
    { name: 'smith', username: 'blue' },
    { name: 'paul', username: 'orange' },
    { name: 'tesla', username: 'ele' },
  ]);

  const tasks = [];
  users.forEach((user, key) => {
    tasks.push({
      title: 'My task' + key,
      number: key,
      description: 'My duty' + key,
      assignee_id: user.id
    });
  });

  return t.context.tasks = await DB.models.Task.save(tasks);
});

test.afterEach(async(t) => {
  return await DB.clearDB();
});

test.after('cleanup', async function () {
  await DB.dropDB();
  return await DB.instance.r.getPool().drain();
});

test.serial('it resolve a list of users', async(t) => {
  const { resolve } = t.context.graphqlThinky;

  const userType = Graph.userType();
  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolve('User')
    }
  });

  const result = await graphql(schema, `
      {
        users {
         name
        }
      }
    `);

  expect(result.data.users).to.have.lengthOf(t.context.users.length);

  result.data.users.forEach((user) => {
    expect(user).to.have.property('name').that.is.a('string');
  });
});

test.serial('it resolve a list of users with related tasks', async(t) => {
  const { resolve } = t.context.graphqlThinky;

  const taskType = Graph.taskType();
  const userType = Graph.userType({
    tasks: {
      type: new GraphQLList(taskType),
      resolve: resolve('User','tasks')
    }
  });
  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolve('User')
    }
  });

  const result = await graphql(schema, `
      {
        users {
         name
         
         tasks {
           title
         }
        }
      }
    `);

  expect(result.data.users).to.have.lengthOf(t.context.users.length);

  result.data.users.forEach((user) => {
    expect(user).to.have.property('name').that.is.a('string');

    user.tasks.forEach((task) => {
     expect(task).to.have.property('title').that.is.a('string')
    });
  });
});

test.serial('it resolve a list of users with related tasks given ast name different then relation name', async(t) => {
  const { resolve } = t.context.graphqlThinky;

  const taskType = Graph.taskType();
  const userType = Graph.userType({
    tasksList: {
      type: new GraphQLList(taskType),
      resolve: resolve('User','tasks')
    }
  });
  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolve('User')
    }
  });

  const result = await graphql(schema, `
      {
        users {
         name
         
         tasksList {
           title
         }
        }
      }
    `);

  expect(result.data.users).to.have.lengthOf(t.context.users.length);

  result.data.users.forEach((user) => {
    expect(user).to.have.property('name').that.is.a('string');

    user.tasksList.forEach((task) => {
      expect(task).to.have.property('title').that.is.a('string')
    });
  });
});

test.serial('it resolve a connection of users', async(t) => {
  
  const { connect } = t.context.graphqlThinky;
  const userType = Graph.userType();

  const schema = Graph.createSchema({
    users: {
        ...connect('User', null, {
          connection: {
            name: 'UserConnection',
            type: userType
          }
        })
    }
  });

  const result = await graphql(schema, `
    {
      users {
        edges {
          node {
            name
          } 
        }
      }
    }
  `);
  
  expect(result.data.users.edges).to.have.lengthOf(t.context.users.length);

  result.data.users.edges.forEach((user) => {
    expect(user.node).to.have.property('name').that.is.a('string');
  });
});

test.serial('it resolve a connection of users and related connection tasks', async(t) => {

  const { connect } = t.context.graphqlThinky;
  const taskType = Graph.taskType({});

  const userType = Graph.userType({
    tasksConnection: {
        ...connect('User','tasks', {
          connection: {
            name: 'UserTaskConnection',
            type: taskType
          }
        })
    }
  });

  const schema = Graph.createSchema({
    usersConnection: {
      ...connect('User', null, {
        connection: {
          name: 'UserConnection',
          type: userType
        }
      })
    }
  });

  const result = await graphql(schema, `
    {
      usersConnection {
        edges {
          node {
            name
            
            tasksConnection {
              edges {
                node {
                  title
                }
              }
            }
          } 
        }
      }
    }
  `);

  expect(result.data.usersConnection.edges).to.have.lengthOf(t.context.users.length);

  result.data.usersConnection.edges.forEach((user) => {
    expect(user.node).to.have.property('name').that.is.a('string');
    user.node.tasksConnection.edges.forEach((task) => {
      expect(task.node).to.have.property('title').that.is.a('string');
    });
  });
});