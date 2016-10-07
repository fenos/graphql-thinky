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
import resolver from './../../src/resolver';
import Node from '../../src/node';

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

test.serial('should return a list (Array) of records given a Thinky model', async (t) => {

  const userType = Graph.userType({
    tasks: {
      type: Graph.taskType()
    }
  });

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver)
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  const users = t.context.users;
  expect(result.data.users).to.have.length.above(0);

  const usersNames = users.map(user => ({name: user.name}));
  // As the GraphQL query doesn't specify an ordering,
  // the order of the two lists can not be asserted.
  expect(result.data.users).to.deep.have.members(usersNames);
});

test.serial('should return a single record (Object) given a Thinky model', async (t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    user: {
      type: userType,
      resolve: resolver(UserResolver)
    }
  });

  const result = await graphql(schema, `
      {
        user {
          name
          username
          virtualName
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data.user).to.have.property('name')
      .that.is.a('string');

  expect(result.data.user).to.have.property('username')
      .that.is.a('string');

  expect(result.data.user).to.have.property('virtualName')
      .that.is.a('string');
});

test.serial('should find a record by id', async(t) => {

  const userType = Graph.userType();
  const user = _.sample(t.context.users);

  const UserResolver = new Node({
    name: 'users',
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    user: {
      args: {
        id: {
          type: GraphQLString
        }
      },
      type: userType,
      resolve: resolver(UserResolver)
    }
  });

  const result = await graphql(schema, `
      {
        user (id: "${user.id}") {
          id
          name
          username
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data).to.deep.equal({
    user: {
      id: user.id,
      name: user.name,
      username: user.username
    }
  });
});

test.serial('should allow to manipulate query options', async(t) => {

  const userType = Graph.userType();
  const user = _.find(t.context.users,{name: 'jhon'});

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    user: {
      type: userType,
      resolve: resolver(UserResolver, {
        before: (options,args) => {
          options.filter = options.filter || {};
          options.filter.name = 'jhon';
          return options;
        }
      })
    }
  });

  const result = await graphql(schema, `
      {
        user {
          id
          name
          username
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data).to.deep.equal({
    user: {
      id: user.id,
      name: user.name,
      username: user.username
    }
  });
});

test.serial('should limit results when limit arg is requested', async(t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      args: {
        offset: {
          type: GraphQLInt
        }
      },
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        list: true
      })
    }
  });

  const result = await graphql(schema, `
      {
        users(offset: 2) {
          id
          name
          username
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data.users).to.have.lengthOf(2);
});

test.serial('should add filter to a query', async(t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        before: (opts) => {
          opts.filter.name = 'fabri';
          return opts;
        }
      })
    }
  });

  const result = await graphql(schema, `
      {
        users {
          id
          name
          username
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data.users[0]).to.have.property('name').that.is.equal('fabri');//
});

test.serial('should add filter to a nested query', async(t) => {

  const UserResolver = new Node({
    model: DB.models.User
  });

  const TaskResolver = new Node({
    model: DB.models.Task,
    related: {
      ...DB.models.User._joins.tasks,
      parentModelName: 'user',
    }
  });

  const userType = Graph.userType({
    tasks: {
      type: new GraphQLList(Graph.taskType()),
      resolve: resolver(TaskResolver, {
        before: (opts) => {
          opts.filter.title = 'My task0';
          return opts;
        }
      })
    }
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver)
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        users {
          id
          name
          username

          tasks {
            title
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  result.data.users.forEach((user) => {
    user.tasks.forEach((task) => {
      expect(task).to.have.property('title').that.is.equal('My task0');
    })
  });
});

test.serial('should order results by name ', async(t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      args: {
        order: {
          type: GraphQLString
        }
      },
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver)
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        users(order: "name") {
          id
          name
          username
          virtualName
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  let orderedUser = t.context.users.map(function(user) {
    return {...user};
  });
  orderedUser = _.orderBy(orderedUser,'name');

  expect(result.data.users).to.deep.have.equal(orderedUser);
});

test.serial('should order results to desc', async(t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    name: 'users',
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      args: {
        order: {
          type: GraphQLString
        }
      },
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver,{thinky: DB.instance})
    }
  });

  const result = await graphql(schema, `
      {
        users(order: "reverse:name") {
          id
          name
          username
          virtualName
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  let orderedUser = t.context.users.map(function(user) {
    return {...user};
  });
  orderedUser = _.orderBy(orderedUser,'name','desc');
  expect(result.data.users).to.deep.have.equal(orderedUser);
});

test.serial('should allow manipulate the query results', async(t) => {

  const userType = Graph.userType();

  const UserResolver = new Node({
    model: DB.models.User
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        after: (result,args,context) => {
          return result.map(function () {
            return {
              name: 'GRAPH'
            };
          });
        }
      })
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  const users = t.context.users;

  expect(result.data.users).to.have.length(users.length);

  result.data.users.forEach(function (user) {
    expect(user.name).to.equal('GRAPH');
  });
});

test.serial('should allow for nested fetching', async(t) => {

  const UserResolver = new Node({
    name: 'users',
    model: DB.models.User
  });

  const TaskResolver = new Node({
    model: DB.models.Task,
    related: {
      ...DB.models.User._joins.tasks,
      parentModelName: 'user',
      relationName: 'tasks'
    }
  });

  const userType = Graph.userType({
    tasks: {
      type: new GraphQLList(Graph.taskType()),
      resolve: resolver(TaskResolver)
    }
  });

  const user = t.context.users[0];

  const schema = Graph.createSchema({
    user: {
      type: userType,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLString)
        }
      },
      resolve: resolver(UserResolver),
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        user(id: "${user.id}") {
          name
          tasks {
            title
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  expect(result.data.user.tasks).to.have.length.within(0,1000);

});

test.serial('should allow for nested recursive fetching', async(t) => {

  const tags = [];
  t.context.tasks.forEach( (task, key) => {
    const Tag = new DB.models.Tag({
      name: 'tag' + key,
      description: 'tag-n-' + key
    });
    task.tags = [Tag];
    tags.push(task.saveAll({tags: true}));
  });

  await Promise.all(tags);

  const User = DB.models.User;
  const Task = DB.models.Task;
  const Tag = DB.models.Tag;

  const UserResolver = new Node({
    model: User
  });

  const TagResolver = new Node({
    model: Tag,
    related: {
      ...Task._joins.tags,
      parentModelName: 'task',
      relationName: 'tags'
    }
  });

  const TaskResolver = new Node({
    model: Task,
    related: {
      ...User._joins.tasks,
      parentModelName: 'user',
      relationName: 'tasks'
    }
  });

  const userType = Graph.userType({
    tasks: {
      type: new GraphQLList(Graph.taskType({
        tags: {
          type: new GraphQLList(Graph.tagType()),
          resolve: resolver(TagResolver,{
            before: (opts) => {
              opts.order = ['name','ASC'];
              return opts;
            }
          })
        }
      })),
      resolve: resolver(TaskResolver)
    }
  });

  const user = t.context.users[0];

  const schema = Graph.createSchema({
    user: {
      type: userType,
      resolve: resolver(UserResolver),
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLString)
        }
      }
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        user(id: "${user.id}") {
          name
          tasks {
            title
            tags {
              name
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  result.data.user.tasks.forEach((task) => {
    task.tags.forEach((tag,key) => {
      expect(tag).to.deep.equal({
        name: 'tag' + key
      });
    });
  });

});

test.serial('should allow for nested recursive fetching 3 level', async(t) => {

  const tags = [];
  t.context.tasks.forEach((task, key) => {
    const Tag = new DB.models.Tag({
      name: 'tag' + key,
      description: 'tag-n-' + key
    });
    task.tags = [Tag];
    tags.push(task.saveAll({ tags: true }));
  });

  await Promise.all(tags);

  const User = DB.models.User;
  const Task = DB.models.Task;
  const Tag = DB.models.Tag;

  const UserResolver = new Node({
    model: User
  });

  const TagTaskResolver = new Node({
    model: Tag,
    related: {
      ...Tag._joins.tasks,
      parentModelName: 'task',
      relationName: 'tags'
    }
  });

  const UserTaskResolver = new Node({
    model: Task,
    related: {
      ...User._joins.tasks,
      parentModelName: 'user',
      relationName: 'tasks'
    }
  });

  const TaskTagResolver = new Node({
    model: Task,
    related: {
      ...Tag._joins.tasks,
      parentModelName: 'tag',
      relationName: 'tasks'
    }
  });

  let TaskType = Graph.taskType({
    tags: {
      type: new GraphQLList(Graph.tagType(() => {
        return {
          tasks: ({
            args: {
              limit: {
                type: GraphQLInt
              }
            },
            type: new GraphQLList(TaskType),
            resolve: resolver(TaskTagResolver)
          })
        }
      })),
      resolve: resolver(TagTaskResolver)
    }
  });

  const userType = Graph.userType({
    tasks: {
      args: {
        limit: {
          type: GraphQLInt
        }
      },
      type: new GraphQLList(TaskType),
      resolve: resolver(UserTaskResolver)
    }
  });

  const user = t.context.users[0];

  const schema = Graph.createSchema({
    user: {
      type: userType,
      resolve: resolver(UserResolver, {
        thinky: DB.instance
      }),
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLString)
        }
      }
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        user(id: "${user.id}") {
          name
          tasks {
            title
            tags {
              name
              tasks(limit: 5) {
                title
              }
            }
          }
        }
      }
    `);

  if (result.errors) throw new Error(result.errors[0].stack);

  result.data.user.tasks.forEach((task) => {
    task.tags.forEach((tag, key) => {
      tag.tasks.forEach((task1) => {
        expect(task1).to.include.keys('title');
      });
    });
  });
});

test.serial("it should handle empty results", async(t) => {

  const UserModel = DB.models.User;
  await UserModel.delete();

  const UserResolver = new Node({
    model: UserModel
  });

  const userType = Graph.userType();

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        thinky: DB.instance
      })
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
        }
      }
    `, null);
  
  expect(result.data.users).to.be.empty;
});

test.serial("it should fetch default attributes", async(t) => {

  const UserModel = DB.models.User;

  const UserResolver = new Node({
    model: UserModel
  });

  const userType = Graph.userType();

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        requestedFields: ['surname'],
      })
    }
  });

  const result = await graphql(schema, `
      {
        users {
          name
        }
      }
    `, null);

  result.data.users.forEach(user => {
    expect(user.name).to.be.a('string');
    expect(user.surname).to.be.a('string');
  });
});

test.serial("it should not allow limiting result more then the default limit to prevent hacks", async(t) => {

  const UserModel = DB.models.User;

  const UserResolver = new Node({
    model: UserModel
  });

  const userType = Graph.userType();

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      args: {
        limit: {
          type: GraphQLInt
        }
      },
      resolve: resolver(UserResolver, {
        maxLimit: 2,
        thinky: DB.instance
      })
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        users(limit: 100000) {
          name
        }
      }
    `, null);

  expect(result.data.users).to.have.lengthOf(2);
});

test.serial("it should allow to overwrite and compose a custom query on each Node", async(t) => {

  const UserModel = DB.models.User;
  const TaskModel = DB.models.Task;

  const user = await UserModel.get(t.context.users[0].id).getJoin({tasks: true}).run();
  const task = user.tasks[0];

  const UserResolver = new Node({
    model: UserModel,
    query: (seq,args,thinky) => {
      return seq.filter({id: user.id});
    }
  });

  const TaskResolver = new Node({
    model: TaskModel,
    query: (seq) => {
      return seq.filter({id: task.id});
    }
  });

  const userType = Graph.userType({
    tasks: {
      type: new GraphQLList(Graph.taskType()),
      resolve: resolver(TaskResolver,{

      })
    }
  });

  const schema = Graph.createSchema({
    users: {
      type: new GraphQLList(userType),
      resolve: resolver(UserResolver, {
        thinky: DB.instance
      })
    }
  });

  const result = await Graph.executeQuery(schema, `
      {
        users {
          id
          name
          tasks {
            id
            title
          }
        }
      }
    `, null);

  expect(result.data.users).to.have.lengthOf(1);
  expect(result.data.users[0].id).to.equal(user.id);
  expect(result.data.users[0].tasks[0].id).to.equal(task.id);
});