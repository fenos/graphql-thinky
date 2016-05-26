import {buildQuery} from './queryBuilder';
import {resolveConnection} from './relay';
import assert from 'assert';

/**
 * Node class
 */
class Node {

  constructor({model, tree = {}, related = undefined, args = {}, connection = {}, name = ''}) {

    assert(model,'You need to provide a thinky Model');

    this.model = model;
    this.related = related;
    this.tree = tree;
    this.args = args;
    this.connection = connection;
    this.name = name; // The name will be populated based to AST name
  }

  async query() {

    this.args.relations = this.tree;
    const Query = buildQuery(this.model, this.args, this.args.thinky);

    let queryResult;

    if (!this.args.list) {
      queryResult = await Query.nth(0).default(null).run();
    } else {
      queryResult = await Query.run();
    }

    return queryResult;
  }

  /**
   * Resolve from tree
   *
   * @param source
   * @returns {*}
   */
  async resolve(source) {
    const result = source[this.name];
    return Promise.resolve(result);
  }

  /**
   * Create a relay connection
   *
   * @returns {{connectionType, edgeType, nodeType, resolveEdge, connectionArgs, resolve}|*}
   */
  connect() {

    if (!this.connection.name) throw Error("Please specify a connection name, before call connect on a Node");
    if (!this.connection.type) throw Error("Please specify a connection type, before call connect on a Node");

    return resolveConnection(this);
  }

  /**
   * Generate data tree
   *
   * @param treeSource
   * @returns {Array}
   */
  async generateDataTree(treeSource, parentSource) {

    if (!this.isRelated()) {
      treeSource = parentSource = await this.query();
    }
    else if (this.isRelated() && treeSource) {

      parentSource = await this.resolve(treeSource);
    }

    if (treeSource && parentSource) {
      return parentSource;
    } else {
      return treeSource;
    }
  }

  /**
   * Set Relation Tree.
   * the three is an array of nodes
   *
   * @param tree array
   */
  setTree(tree) {
    this.tree = tree;
  }

  /**
   * Append Nodes to tree
   *
   * @param Node
   */
  appendToTree(Node) {
    this.tree = { ...this.tree, ...Node };
  }

  /**
   * Get tree
   *
   * @returns {*}
   */
  getTree() {
    return this.tree;
  }

  /**
   * Set args
   *
   * @param args
   */
  setArgs(args) {
    this.args = args;
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
    return (this.related !== undefined);
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
    return this.model.getTableName();
  }
}

export default Node;