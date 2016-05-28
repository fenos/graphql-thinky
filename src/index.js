import resolver from './resolver';
import typeMapper, {toGraphQLDefinition} from './typeMapper';
import { nodeInterfaceMapper} from './relay/nodeDefinition';
import modelToGQLObjectType from './modelToGQLObjectType';
import Node from './Node';

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
   */
  constructor(thinky) {

    this.thinky = thinky;

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
    opts.thinky = this.thinky;

    const Node = this.node(modelName, related);
    return resolver(Node, opts);
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

    if (!opts.connection) throw Error('Please provide a connection option.');
    if (!opts.connection.name) throw Error(`Please provide a name for the connection based on Model: ${modelName}.`);
    if (!opts.connection.type) throw Error(`Please provide a type for the connection based on Model: ${modelName}.`);

    opts.thinky = this.thinky;
    opts.name = related || '';

    const NodeConnector = this.node(modelName, related, opts).connect();

    return {
      type: NodeConnector.connectionType,
      args: {
        ...NodeConnector.connectionArgs,
        ...opts.args || {}
      },
      resolve: NodeConnector.resolve
    }
  };

  /**
   * return a graphQL Object Type
   * definition from a Thinky Model.
   *
   * @param model
   * @param opts
   */
  modelToGraphQLDefinition = (model,opts = {}) => {
    if (typeof model === 'string') {
      model = this.thinky.models[model];
    }
    return toGraphQLDefinition(model,opts);
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

    // Add node interface if relay is specified
    if (opts.globalId === true) {
      opts.interfaces = [this.nodeInterface];
    }

    const gqlObjectType = modelToGQLObjectType(model,opts);
    
    this.nodeTypeMapper.mapTypes({
      [model._schema._model._name]: gqlObjectType
    });

    return gqlObjectType;
  };

  /**
   * Create a node
   *
   * @param modelName
   * @param related
   * @returns {Node}
   */
  node = (modelName, related, opts = {}) => {

    const connection = opts.connection || {};

    const models = this.thinky.models;

    let modelTarget = models[modelName];

    let relation = related;

    if (!modelTarget) throw Error(`Model ${modelName} not found.`);

    // Relation is specified as a string
    if (typeof related === 'string') {
      relation = modelTarget._joins[related];

      // relation not found can't continue
      if (!relation)
        throw Error(
            `Tried to access relation ${related} of the Model ${modelName},
             but relation not found.`
        );
    }
    
    modelTarget = (relation) ? relation.model : modelTarget;
    
    return new Node({
      name: opts.name || '',
      model: modelTarget,
      related: relation,
      connection: {
        ...connection
      }
    });
  };
}

export default GraphqlThinky;