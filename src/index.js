import resolver from './resolver';
import typeMapper, {toGraphQLDefinition} from './typeMapper';
import {nodeInterfaceMapper} from './relay/nodeDefinition';
import modelToGQLObjectType from './modelToGqlObjectType';
import {upperFirst} from 'lodash';
import Node from './node';

const defaultOptions = {
  maxLimit: 50,
  nestingLimit: 10
};

/**
 * GraphqlThinky
 */
class GraphqlThinky {

  static typeMapper = typeMapper;

  /**
   * Graphus constructor accept a Thinky
   * Instance
   *
   * @param thinky
   * @param options
   */
  constructor(thinky, options = {}) {
    this.thinky = thinky;
    this.options = Object.assign(defaultOptions, options);

    const nodeMapper = nodeInterfaceMapper(thinky.models);

    this.nodeField = nodeMapper.nodeField;
    this.nodeInterface = nodeMapper.nodeInterface;
    this.nodeTypeMapper = nodeMapper.nodeTypeMapper;
  }

  /**
   * Resolve a node
   *
   * @param modelName
   * @param related
   * @param opts
   * @returns {Resolver}
   */
  resolve = (modelName, related, opts = {}) => {
    const Node = this.node(modelName, related);
    return resolver(Node, {...this.options, ...opts});
  };

  /**
   * Create a relay connection
   *
   * @param modelName
   * @param related
   * @param opts
   * @returns {Resolver}
   */
  connect = (modelName, related, opts = {}) => {
    /*eslint-disable */
    if (!opts.connection) throw Error('Please provide a connection option.');
    if (!opts.connection.name) throw Error(`Please provide a name for the connection based on Model: ${modelName}.`);
    if (!opts.connection.type) throw Error(`Please provide a type for the connection based on Model: ${modelName}.`);
    /*eslint-enable */

    const NodeConnector = this.node(modelName, related, {
      ...this.options,
      ...opts
    }).connect();

    return {
      type: NodeConnector.connectionType,
      args: {
        ...NodeConnector.connectionArgs,
        ...opts.args || {}
      },
      resolve: NodeConnector.resolve
    };
  };

  /**
   * return a graphQL Object Type
   * definition from a Thinky Model.
   *
   * @param model
   * @param opts
   */
  modelToGraphQLDefinition = (model, opts = {}) => {
    if (typeof model === 'string') {
      model = this.thinky.models[model];
    }

    if (!model) {
      throw new Error(`Model name: ${model} not found.`);
    }

    return toGraphQLDefinition(model, opts);
  };

  /**
   * Create a GraphQLObjectType based
   * to a thinky model. Using this helper
   * you'll get free Node type mapping
   * for relay
   *
   * @param model
   * @param opts
   * @returns {GraphQLObjectType}
   */
  createModelType = (model, opts = {}) => {
    if (typeof model === 'string') {
      model = this.thinky.models[model];
    }

    if (!model) {
      throw new Error(`Model name: ${model} not found.`);
    }

    // Add node interface if relay is specified
    if (opts.globalId === true) {
      opts.interfaces = [this.nodeInterface];
    }

    const gqlObjectType = modelToGQLObjectType(model, opts);

    this.nodeTypeMapper.mapTypes({
      [gqlObjectType.name]: gqlObjectType
    });

    return gqlObjectType;
  };

  /**
   * Create a node
   *
   * @param modelName
   * @param related
   * @param opts
   * @returns {Node}
   */
  node = (modelName, related, opts = {}) => {
    if (!opts.name) {
      opts.name = '';
    }

    const connection = opts.connection || {};

    const models = this.thinky.models;

    let modelTarget = models[modelName],
      relation = related;

    if (!modelTarget) {
      throw new Error(`Model ${modelName} not found.`);
    }

    // Relation is specified as a string
    if (typeof related === 'string') {
      relation = modelTarget._joins[related];

      // relation not found can't continue
      if (!relation) {
        throw new Error(
            `Tried to access relation ${related} of the Model ${modelName},
             but relation not found.`
        );
      }
    }

    modelTarget = (relation) ? relation.model : modelTarget;

    return new Node({
      name: related || opts.name,
      model: modelTarget,
      related: relation,
      thinky: this.thinky,
      query: opts.query,
      connection: {
        ...connection
      }
    });
  };
}

export default GraphqlThinky;

