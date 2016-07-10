import test from 'ava';

import thinky from './../helpers/db/thinky';
import thinkySchema from 'thinky-export-schema';
import {expect} from 'chai';
import {toGraphQLDefinition,attributeToGraphQLType} from './../../src/typeMapper';
import {
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLEnumType,
  GraphQLNonNull
} from 'graphql';

import {
  toGlobalId
} from 'graphql-relay';

const thinkyType = thinky.type;


test('it should return a GraphQLString for types: [string, date, id]', () => {

  const resultWithString = attributeToGraphQLType(thinkyType.string());
  const resultWithDate = attributeToGraphQLType(thinkyType.date());
  const resultWithID = attributeToGraphQLType(thinkyType.id());

  expect(resultWithString).to.be.equal(GraphQLString);
  expect(resultWithDate).to.be.equal(GraphQLString);
  expect(resultWithID).to.be.equal(GraphQLString);

});

test('it should return a GraphQLBoolean for types: [boolean]', () => {

  const result = attributeToGraphQLType(thinkyType.boolean());

  expect(result).to.be.equal(GraphQLBoolean);
});


test('it should return a GraphQLInt for types: [number]', () => {

  const result = attributeToGraphQLType(thinkyType.number());

  expect(result).to.be.equal(GraphQLInt);
});

test('it should return a GraphQLObjectType for types: [object]', () => {

  const result = attributeToGraphQLType(thinkyType.object().schema({
    profile: thinkyType.string()
  }),'images');

  expect(result).to.be.an.instanceof(GraphQLObjectType);
  expect(result._typeConfig.fields.profile.type).to.be.equal(GraphQLString);
});

test('it should throw exception if the name of a object is not Specified', () => {

  const result = () => {
    return attributeToGraphQLType(thinkyType.object().schema({
      profile: thinkyType.string()
    }));
  };

  expect(result).to.throw('Specify a name for the Object Attribute type');
});

test('it should return a GraphQLList for types: [array]', () => {

  const result = attributeToGraphQLType(
       thinkyType.array().schema(thinkyType.number())
  );

  expect(result).to.be.an.instanceof(GraphQLList);
});

test('it should return a GraphQLList of GraphQLObjectType for type: [array]', () => {

  const result = attributeToGraphQLType(
      thinkyType.array().schema(thinkyType.object().schema({
        images: thinkyType.string()
      })),'images'
  );

  expect(result).to.be.an.instanceof(GraphQLList);
});

test('it should return a GraphQLENUM for type: [string,enum]', () => {

  const result = attributeToGraphQLType(
      thinkyType.string().enum(['yes','no'])
  );

  expect(result).to.be.an.instanceof(GraphQLEnumType);
});


test("it transform a thinky model with string attrs, to a GraphQL definition", () => {

  const Model = thinky.createModel('user-test', {
    name: thinkyType.string(),
    surname: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model);

  Object.keys(GraphQLFields).forEach((key) => {
    expect(GraphQLFields[key].type).to.be.equal(GraphQLString);
  });
});

test("it transform a thinky model to a GraphQL definition", () => {

  const Model = thinky.createModel('usertest1', {
    name: thinkyType.string(),
    surname: thinkyType.string(),
    images: thinkyType.object().schema({
      profile: thinkyType.string(),
      cover: thinkyType.string()
    }),
    social: thinkyType.array().schema(thinkyType.string()),
    myVirtual: thinkyType.virtual(),
    myAny: thinkyType.any()
  });

  const GraphQLFields = toGraphQLDefinition(Model);
  expect(GraphQLFields['id'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['name'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['surname'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['images'].type).to.be.an.instanceof(GraphQLObjectType);
  expect(GraphQLFields['images'].type._typeConfig.fields.profile.type).to.be.equal(GraphQLString);
  expect(GraphQLFields['images'].type._typeConfig.fields.cover.type).to.be.equal(GraphQLString);
  expect(GraphQLFields['social'].type).to.be.an.instanceof(GraphQLList);

  // Virtual and ANY are not converted to a graphql definition
  // because we can't strongly type them.
  expect(GraphQLFields['myVirtual']).to.be.undefined;
  expect(GraphQLFields['myAny']).to.be.undefined;
});

test("it should add GraphQLNotNull type to required fields", () => {

  const Model = thinky.createModel('user-test-5', {
    name: thinkyType.string().allowNull(false),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model);

  expect(GraphQLFields['name'].type).to.be.instanceof(GraphQLNonNull);
});

test("it should by pass the not null definition", () => {

  const Model = thinky.createModel('user-test-7', {
    name: thinkyType.string().allowNull(false),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model, {
    allowNull: false
  });

  expect(GraphQLFields['name'].type).to.be.not.instanceof(GraphQLNonNull);
  expect(GraphQLFields['name'].type).to.be.equal(GraphQLString);
});

test("it should exclude the specified attributes from the GraphQL Definition", () => {

  const Model = thinky.createModel('user-test-2', {
    name: thinkyType.string(),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model, {
    exclude: ['name','surname']
  });

  expect(GraphQLFields['name']).to.be.undefined
  expect(GraphQLFields['surname']).to.be.undefined;
  expect(GraphQLFields['email'].type).to.be.equal(GraphQLString);

});

test("it should convert only the specified attributes to a GraphQL Definition", () => {

  const Model = thinky.createModel('user-test-3', {
    name: thinkyType.string(),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model, {
    only: ['name','surname']
  });

  expect(GraphQLFields['name'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['surname'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['email']).to.be.undefined;

});

test("it should map fields", () => {

  const Model = thinky.createModel('user-test-4', {
    name: thinkyType.string(),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model, {
    map: {
      email: 'EMAIL'
    }
  });

  expect(GraphQLFields['EMAIL'].type).to.be.equal(GraphQLString);
  expect(GraphQLFields['email']).to.be.undefined;
});

test("it should add a relay global ID", () => {

  const Model = thinky.createModel('user-test-6', {
    name: thinkyType.string(),
    surname: thinkyType.string(),
    email: thinkyType.string()
  });

  const GraphQLFields = toGraphQLDefinition(Model, {
    globalId: true
  });

  expect(GraphQLFields.id.resolve).to.be.ok;
  expect(GraphQLFields.id.type.ofType.name).to.equal('ID');
  expect(GraphQLFields.id.resolve({
    id: 'hello'
  })).to.equal(toGlobalId('User-test-6', 'hello'));

  expect(GraphQLFields['user-test-6ID'].type).to.be.deep.equal(GraphQLString);
});