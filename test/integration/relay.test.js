import test from 'ava';
import {expect} from 'chai';
import {DB,graphql as Graph} from './../helpers';
import {
    graphql,
    GraphQLList,
    GraphQLInt,
    GraphQLString,
    GraphQLEnumType,
    GraphQLNonNull
} from 'graphql';
import _ from 'lodash';
import {resolveConnection} from './../../src/relay';
import {nodeInterfaceMapper} from './../../src/relay/nodeDefinition';
import resolver from './../../src/resolver';
import Node from './../../src/Node';

test.beforeEach(async function(t) {

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
    tasks.push({title: 'My task'+key, description: 'My duty'+key, assignee_id: user.id});
  });

  const {
    nodeInterface,
    nodeField,
    nodeTypeMapper
  } = nodeInterfaceMapper(DB.models);

  t.context.nodeField = nodeField;
  t.context.nodeTypeMapper = nodeTypeMapper;
  t.context.nodeInterface = nodeInterface;

  nodeTypeMapper.mapTypes({
    ['User']: { type: Graph.userType() },
    ['Task']: { type: Graph.taskType() }
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

test.serial('should return a list Of edges and nodes', async (t) => {

  const User = new Node({
    model: DB.models.User
  });

  const TaskConnector = new Node({
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType()
    }
  }).connect();

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(User)
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
          tasks {
            edges {
              node {
               title
              }
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  result.data.users.forEach((user) => {
    user.tasks.edges.forEach((task) => {
      expect(task.node).to.have.property('title');
    })
  });
});

test.serial('should limit a connection of results', async (t) => {

  const tasks = [];

  // 2 tasks for each users
  t.context.users.forEach((user,key) => {
    tasks.push({title: 'My task'+key, description: 'My duty'+key, assignee_id: user.id});
  });

  t.context.tasks = await DB.models.Task.save(tasks);

  const User = new Node({
    model: DB.models.User
  });

  const TaskConnector = new Node({
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType()
    }
  }).connect();

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(User)
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
          tasks(first: 2) {
            edges {
              node {
               title
              }
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  result.data.users.forEach((user) => {
    user.tasks.edges.forEach((task) => {
      expect(task.node).to.have.property('title');
    })
  });

  result.data.users.forEach((user) => {
    expect(user.tasks.edges).to.have.lengthOf(2);
  });
});

test.serial('should paginate a connection of results', async (t) => {

  const tasks = [];
  const user = _.sample(t.context.users);

  // 4 tasks for the user
  [1,2].forEach((_,key) => {
    tasks.push({title: 'My task'+key, description: 'My duty'+key, assignee_id: user.id});
  });

  await DB.models.Task.save(tasks);

  const User = new Node({
    model: DB.models.User
  });

  const TaskConnector = new Node({
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType()
    }
  }).connect();

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    user: {
      args: {
        id: {
          type: GraphQLString
        }
      },
      type: userType,
      resolve: resolver(User)
    }
  });

  const firstDataSet = await graphql(schema, `
      {
        user (id: "${user.id}") {
          name
          tasks(first: 2) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
               title
              }
            }
          }
        }
      }
  `);

  if (firstDataSet.errors) throw new Error(firstDataSet.errors[0].stack);

  expect(firstDataSet.data.user.tasks.edges).to.have.lengthOf(2);
  expect(firstDataSet.data.user.tasks.pageInfo.hasNextPage).to.be.equal(true);
  expect(firstDataSet.data.user.tasks.pageInfo.hasPreviousPage).to.be.equal(false);

  const lastTaskIndex = firstDataSet.data.user.tasks.edges.length - 1;
  const cusor         = firstDataSet.data.user.tasks.edges[lastTaskIndex].cursor;

  const secondDataSet = await graphql(schema, `
      {
        user (id: "${user.id}") {
          name
          tasks(first: 2, after: "${cusor}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
               title
              }
            }
          }
        }
      }
  `);

  expect(secondDataSet.data.user.tasks.edges).to.not.include.members(firstDataSet.data.user.tasks.edges);
  expect(secondDataSet.data.user.tasks.edges[0].cursor).to.not.equal(cusor);

  expect(secondDataSet.data.user.tasks.pageInfo.hasNextPage).to.be.equal(false);
  expect(secondDataSet.data.user.tasks.pageInfo.hasPreviousPage).to.be.equal(true);
});

test.serial('should paginate a connection of results, asserting page info based to 2:6', async (t) => {

  const tasks = [];
  const user = _.sample(t.context.users);

  // 4 tasks for the user
  [1,2,3,4].forEach((_,key) => {
    tasks.push({title: 'My task'+key, description: 'My duty'+key, assignee_id: user.id});
  });

  await DB.models.Task.save(tasks);

  const User = new Node({
    model: DB.models.User
  });

  const TaskConnector = new Node({
    name: 'tasks',
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType()
    }
  }).connect();

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    user: {
      args: {
        id: {
          type: GraphQLString
        }
      },
      type: userType,
      resolve: resolver(User)
    }
  });

  const firstDataSet = await graphql(schema, `
      {
        user (id: "${user.id}") {
          name
          tasks(first: 2) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
               title
              }
            }
          }
        }
      }
  `);

  if (firstDataSet.errors) throw new Error(firstDataSet.errors[0].stack);

  expect(firstDataSet.data.user.tasks.edges).to.have.lengthOf(2);
  expect(firstDataSet.data.user.tasks.pageInfo.hasNextPage).to.be.equal(true);
  expect(firstDataSet.data.user.tasks.pageInfo.hasPreviousPage).to.be.equal(false);


  let lastTaskIndex = firstDataSet.data.user.tasks.edges.length - 1;
  let cusor         = firstDataSet.data.user.tasks.edges[lastTaskIndex].cursor;

  const secondDataSet = await graphql(schema, `
      {
        user (id: "${user.id}") {
          name
          tasks(first: 2, after: "${cusor}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
               title
              }
            }
          }
        }
      }
  `);

  expect(secondDataSet.data.user.tasks.edges).to.not.include.members(firstDataSet.data.user.tasks.edges);
  expect(secondDataSet.data.user.tasks.edges[0].cursor).to.not.equal(cusor);

  expect(secondDataSet.data.user.tasks.pageInfo.hasNextPage).to.be.equal(true);
  expect(secondDataSet.data.user.tasks.pageInfo.hasPreviousPage).to.be.equal(true);


  lastTaskIndex = secondDataSet.data.user.tasks.edges.length - 1;
  cusor         = secondDataSet.data.user.tasks.edges[lastTaskIndex].cursor;

  const thridDataSet = await graphql(schema, `
      {
        user (id: "${user.id}") {
          name
          tasks(first: 2, after: "${cusor}") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
               title
              }
            }
          }
        }
      }
  `);

  expect(thridDataSet.data.user.tasks.edges).to.not.include.members(secondDataSet.data.user.tasks.edges);
  expect(thridDataSet.data.user.tasks.edges[0].cursor).to.not.equal(cusor);

  expect(thridDataSet.data.user.tasks.pageInfo.hasNextPage).to.be.equal(false);
  expect(thridDataSet.data.user.tasks.pageInfo.hasPreviousPage).to.be.equal(true);
});

test.serial('should order a connection of results', async (t) => {

  const tasks = [];
  const user = _.sample(t.context.users);

  // 2 tasks for each users
  t.context.users.forEach((user,key) => {
    tasks.push({title: 'My task'+key, description: 'My duty'+key, assignee_id: user.id});
  });

  t.context.tasks = await DB.models.Task.save(tasks);

  const TaskConnector = new Node({
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    thinky: DB.instance,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType(),
      params: {
        orderBy: new GraphQLEnumType({
          name: 'UserTaskConnectionOrder',
          values: {
            NAME: {value: ['title','DESC']}
          }
        })
      }
    }
  }).connect();

  const User = new Node({
    model: DB.models.User
  });

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    user: {
      args: {
        id: {
          type: GraphQLString
        }
      },
      type: userType,
      resolve: resolver(User)
    }
  });

  const result = await graphql(schema, `
      {
        user(id: "${user.id}") {
          name
          tasks(orderBy: NAME) {
            edges {
              node {
               title
              }
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  const resultOrderedDesc = await DB.models.Task.filter({assignee_id: user.id}).pluck('title').orderBy(DB.instance.r.desc('title')).run().map((task) => {
    return {node: {...task}};
  });

  expect(result.data.user.tasks.edges).to.be.deep.equal(resultOrderedDesc);
});

test.serial('should filter a connection of results', async (t) => {

  const tasks = [];
  let user = await _.sample(t.context.users);


  // 2 tasks for each users
  t.context.users.forEach((user,key) => {
    tasks.push({title: 'My task'+key+user.id, description: 'My duty'+key, assignee_id: user.id});
  });

  t.context.tasks = await DB.models.Task.save(tasks);

  user = await user.getModel().get(user.id).getJoin({ tasks: true}).run();

  const TaskConnector = new Node({
    model: DB.models.Task,
    related: DB.models.User._joins.tasks,
    thinky: DB.instance,
    connection: {
      name: 'UserTaskConnection',
      type: Graph.taskType(),
      params: {
        filters: {
          title: true
        }
      }
    }
  }).connect();

  const User = new Node({
    model: DB.models.User
  });

  const userType = Graph.userType({
    tasks: {
      type: TaskConnector.connectionType,
      args: {
        ...TaskConnector.connectionArgs,
        title: {
          type: GraphQLString
        }
      },
      resolve: TaskConnector.resolve
    }
  });

  const schema = Graph.createSchema({
    user: {
      args: {
        id: {
          type: GraphQLString
        }
      },
      type: userType,
      resolve: resolver(User)
    }
  });

  const result = await graphql(schema, `
      {
        user(id: "${user.id}") {
          name
          tasks(title: "${user.tasks[0].title}") {
            edges {
              node {
               title
              }
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  const tasksFormatted = user.tasks.map((task) => {
    return {node: {title: task.title}};
  });

  expect(result.data.user.tasks.edges[0]).to.be.deep.equal(tasksFormatted[0]);
  expect(result.data.user.tasks.edges.length).equal(1);
});
