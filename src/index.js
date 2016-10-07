import { connectionDefinitions, connectionArgs } from 'graphql-relay';
import resolver from './resolver';
import typeMapper, {toGraphQLDefinition} from './typeMapper';
import ModelLoader from './dataloader/modelLoader';
import LoaderFiler from './dataloader/loaderFilter';
import { nodeInterfaceMapper } from './relay/nodeDefinition';
import modelToGQLObjectType from './modelToGqlObjectType';
import Node, {NodeAttributes} from './node';
import commonArgs from './commonArgs';

const defaultOptions = {
  maxLimit: 50,
};

/**
 * GraphqlThinky
 */
class GraphqlThinky {

  static typeMapper = typeMapper;

  commonArgs = commonArgs;

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
    this.loadersKey = options.loadersKey || 'loaders';

    const nodeMapper = nodeInterfaceMapper(thinky.models);

    this.nodeField = nodeMapper.nodeField;
    this.nodeInterface = nodeMapper.nodeInterface;
    this.nodeTypeMapper = nodeMapper.nodeTypeMapper;
  }

  /**
   * Return Model loader
   * object of all models
   * @returns {*}
   */
  getModelLoaders() {
    const models = this.thinky.models;
    return Object.keys(models).reduce((loadersObj, modelName) => {
      const modelLoader = new ModelLoader(models[modelName]);
      loadersObj[modelName] = modelLoader;
      return loadersObj;
    }, {});
  }

  /**
   * Resolve a node
   *
   * @param modelName
   * @param related
   * @param opts
   * @returns {Resolver}
   */
  resolve = (modelName:string, related:string|undefined, opts:NodeAttributes = {}) => {
    const Node = this.node(modelName, related);
    return resolver(Node, { ...this.options, ...opts });
  };

  /**
   * Create a relay connection
   *
   * @param modelName
   * @param related
   * @param opts
   * @returns {Resolver}
   */
  connect = (modelName, related, {connection,args, ...opts} = {}) => {
    /*eslint-disable */
    if (!connection) throw Error('Please provide a connection option.');
    if (!connection.name) throw Error(`Please provide a name for the connection based on Model: ${modelName}.`);
    if (!connection.type) throw Error(`Please provide a type for the connection based on Model: ${modelName}.`);
    /*eslint-enable */

    const NodeConnector = this.node(modelName, related, {
      ...opts,
      connection,
    }).connect({...this.options, ...opts});

    return {
      type: NodeConnector.connectionType,
      args: {
        ...NodeConnector.connectionArgs,
        ...args || {}
      },
      resolve: NodeConnector.resolve
    };
  };

  /**
   * Returns a connection definition
   * based on a graphQL type.
   * This is mostly a helper function
   * when constructing connections based
   * on dataloader.
   * @param gqlType
   * @param args
   * @returns {{type, args: {}}}
   */
  connectTypeDefinition = (gqlType, args) => {
    const { connectionType } = connectionDefinitions({ nodeType: gqlType });
    return {
      type: connectionType,
      args: {
        ...connectionArgs,
        ...args
      }
    };
  }

  shape = (result) => {
    return new LoaderFiler(result);
  }

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
      relation.relationName = related;
      relation.parentModelName = modelTarget.getTableName();

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
      query: opts.query,
      loadersKey: this.loadersKey,
      connection: {
        ...connection
      }
    });
  };
}

export default GraphqlThinky;

