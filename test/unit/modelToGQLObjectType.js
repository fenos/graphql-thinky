import test from 'ava';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt
} from 'graphql';

import {expect} from 'chai';
import modelToGQLObjectType from './../../src/modelToGQLObjectType';
import thinky from './../helpers/db/thinky';
const type = thinky.type;

test('it should create a GraphQLObjectType from a Thinky Model', () => {

  const Model = thinky.createModel('car1', {
    brand: type.string(),
    name: type.string()
  });

  const result = modelToGQLObjectType(Model);
  const fields = result._typeConfig.fields();

  expect(result).to.be.an.instanceof(GraphQLObjectType);
  expect(result.name).to.be.equal('Car1');
  expect(fields.id.type).to.be.equal(GraphQLString);
  expect(fields.brand.type).to.be.equal(GraphQLString);
  expect(fields.name.type).to.be.equal(GraphQLString);
});

test('it should allow to extend the ObjectType Definition', () => {

  const Model = thinky.createModel('car2', {
    brand: type.string(),
    name: type.string()
  });

  const result = modelToGQLObjectType(Model, {
    fields: () => ({
      wheels: {
        type: GraphQLInt
      }
    })
  });

  const fields = result._typeConfig.fields();

  expect(fields.wheels.type).to.be.equal(GraphQLInt);
});

test('it should allow to use the TypeMapper option to define the GraphQLObjectType', () => {

  const Model = thinky.createModel('car3', {
    brand: type.string(),
    name: type.string()
  });

  const result = modelToGQLObjectType(Model, {
    fields: {
      wheels: {
        type: GraphQLInt
      }
    },
    exclude: ['brand']
  });

  const fields = result._typeConfig.fields();

  expect(fields.name.type).to.be.equal(GraphQLString);
  expect(fields.brand).to.be.undefined;
});

test('it should allow to overwrite a field from an automatic generated one', () => {

  const Model = thinky.createModel('car4', {
    brand: type.string(),
    name: type.string()
  });

  const result = modelToGQLObjectType(Model, {
    fields: {
      brand: {
        type: GraphQLInt
      }
    }
  });

  const fields = result._typeConfig.fields();

  expect(fields.brand.type).to.be.equal(GraphQLInt);
});