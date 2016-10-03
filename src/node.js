import assert from 'assert';
import { buildQuery,buildCount,mapCountToResultSet } from './queryBuilder';
import { resolveConnection } from './relay';

export type NodeAttributes = {
  list: boolean,
  filterQuery: boolean,
  attributes: Array<string>,
  filter: Object<FK,FV>,
  skip?: number,
  index?: number,
  offset?: number,
  order?: string,
  count: boolean
};

export type NodeOptions = {
  model: Object,
  related: Object, // TODO
  args: NodeAttributes,
  connection: Object, // TODO
  name: string,
  query?: func<Promise>,
  loadersKey: string,
};

/**
 * Node class
 */
class Node {

  constructor({ model, related = undefined, args = {}, connection = {}, name = '', query = undefined, loadersKey = 'loaders'}:NodeOptions) {
    assert(model, 'You need to provide a thinky Model');

    this.model = model;
    this.related = related;
    this.args = args;
    this.connection = connection;
    this.name = name; // The name will be populated based to AST name if not provided
    this.query = query;
    this.loadersKey = loadersKey;
  }

  /**
   * Resolve node based
   * a rethinkDB query
   *
   * @param thinky
   * @returns {*}
   */
  async queryResolve(loaders) {
    this.args.query = this.query;

    let queryResult;

    if (this.args.list) {
      const Query = buildQuery(this.model, this.args, this.model._thinky);
      queryResult = await Query.run();

      if (loaders) {
        queryResult.forEach(row => {
          loaders[this.getModelName()]._getOrCreateLoader('loadBy', 'id')
            .prime(row.id,row);
        });
      }

      if (this.args.count) {
        const queryCountResult = await buildCount(
          this.model,
          [],
          null,
          this.args
        );

        queryResult = queryResult.map(row => {
          row.fullCount = queryCountResult;
          return row;
        });
      }
    } else {
      const Query = buildQuery(this.model, {
        ...this.args,
        offset: false,
      }, this.model._thinky);
      queryResult = await Query.nth(0).default(null).run();
    }

    return queryResult;
  }

  /**
   * Resolve from tree
   *
   * @param source
   * @returns {*}
   */
  fromParentSource(source) {
    const result = source[this.name];
    return result;
  }

  /**
   * Create a relay connection
   *
   * @returns {{connectionType, edgeType, nodeType, resolveEdge, connectionArgs, resolve}|*}
   */
  connect(resolveOptions) {
    /*eslint-disable */
    if (!this.connection.name) throw new Error("Please specify a connection name, before call connect on a Node");
    if (!this.connection.type) throw new Error("Please specify a connection type, before call connect on a Node");
    /*eslint-enable */

    return resolveConnection(this,resolveOptions);
  }

  /**
   * Generate data tree
   *
   * @param treeSource
   * @param thinky
   * @returns {Array}
   */
  async resolve(treeSource, context) {
    let result = treeSource;
    const loaders = context[this.loadersKey];

    if (!this.isRelated()) {
      result = await this.queryResolve(loaders);
    } else if (this.isRelated() && treeSource) {
      result = this.fromParentSource(treeSource);

      if (!loaders) {
        throw new Error(`
          GraphQL-thinky couldn't find any loaders set into the context
          with the key "${this.loadersKey}"
        `);
      }

      if (!result && treeSource && loaders) {
        result = this.resolveWithLoaders(treeSource, loaders);
      }
    }

    return result;
  }

  /**
   * Resolve with loaders
   * @param treeSource
   * @param loaders
   * @returns {*}
   */
  async resolveWithLoaders(treeSource, loaders) {
    let result;
    // Resolve with Loaders from the context
    const FkJoin = this.related.leftKey;
    this.args.attributes.push(FkJoin);
    if (this.related.type === 'belongsTo') {
      result = await loaders[this.related.model.getTableName()].loadById(treeSource[FkJoin]);
    } else {
      result = await loaders[this.related.parentModelName]
        .related(this.name, treeSource[FkJoin], this.args);
    }

    if (this.args.list) {
      return result.toArray();
    } else {
      return result.toObject(this.args);
    }
  }

  /**
   * Append args
   *
   * @param args
   */
  appendArgs(args) {
    this.args = { ...this.args, ...args };
  }

  /**
   * Determine if this node is a connection
   *
   * @returns {string|*}
   */
  isConnection() {
    return (this.connection.name && this.connection.type);
  }

  /**
   * Determine if the node is related
   *
   * @returns {boolean}
   */
  isRelated() {
    return Boolean(this.related);
  }

  /**
   * Get model of the Node
   *
   * @returns {*}
   */
  getModel() {
    return this.model;
  }

  /**
   * Get model Name
   *
   * @return {string}
   */
  getModelName() {
    return this.model._schema._model._name;
  }
}

export default Node;
