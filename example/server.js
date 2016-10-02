import express from 'express';
import bodyParser from 'body-parser';
import expressGraphql from 'express-graphql';
import schema from './app/graphql';
import models from './app/models';
import {bindLogger} from './app/thinky';
import GT from './app/graphql/graphql-thinky';

import data from './data.json';

const app = express();

app.use(bodyParser.json());
app.use('/graphql',(req,res) => {
  return expressGraphql({
    schema,
    graphiql: true,
    pretty: true,
    context: {
      loaders: GT.getModelLoaders(),
    }
  })(req,res);
});

app.listen(7000, async function() {

  await models.user.delete();
  await models.todo.delete();

  const saved = [];

  data.forEach((user) => {
    const userModel = new models.user(user);
    saved.push(userModel.saveAll({todos: true}));
  });

  await Promise.all(saved);

  console.log("Graphql-thinky started on port: 7000");
  
  bindLogger();
});