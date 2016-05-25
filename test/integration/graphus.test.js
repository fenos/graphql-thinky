import test from 'ava';
import {DB,graphql} from './../helpers';
import Graphus from './../../src/index';
import Node from './../../src/Node';
import {expect} from 'chai';

test.beforeEach((t) => {
  t.context.graphus = new Graphus(DB);
});

test('it should allow to register types into nodeTypeMapper', (t) => {

  const {nodeTypeMapper} = t.context.graphus;
  const userType = graphql.userType();

  nodeTypeMapper.mapTypes({
    'user': userType
  });

  expect(nodeTypeMapper.map.user.type).to.be.deep.equal(userType);
});

test('it should create a node based to a model', (t) => {
  const graphus = t.context.graphus;

  const node = graphus.node('User');
  expect(node).to.be.an.instanceof(Node);
});

test('it should create a connection based to a model', (t) => {

  const graphus = t.context.graphus;
  const userType = graphql.userType();

  const connection = graphus.connect('User',null,{
    connection: {
      name: 'UserConnection',
      type: userType
    }
  });

  expect(connection).to.have.property('type');
  expect(connection).to.have.property('args');
  expect(connection).to.have.property('resolve');
});