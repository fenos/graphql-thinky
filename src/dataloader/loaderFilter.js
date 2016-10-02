import { chain, isObject } from 'lodash';
import {
  connectionFromArray
} from 'graphql-relay';
import { NodeAttributes } from './../node';

class LoaderFilter {

  constructor(results, filtering: NodeAttributes = {}) {

    this.results = results;
    this.filtering = {
      limit: 40,
      orderBy: {},
      filter: {},
      paginate: null,
      ...filtering,
    };
  }

  toObject() {
    if (isObject(this.results)) {
      return this.results;
    }
    if (Array.isArray(this.results)) {
      const result = this.toArray();
      return result[0] || {};
    }

    throw new Error("Couldn't transform result to Object");
  }

  /**
   * Resolve results with filtering
   * applyed
   * @returns {Array|*}
   */
  toArray() {
    let results;
    if (!Array.isArray(this.results)) {
      results = [this.results];
    } else {
      results = this.results;
    }
    const { index, offset, orderBy, filter } = this.filtering;
    let resultFiltered = chain(results);

    if (Object.keys(orderBy).length > 0) {
      resultFiltered = resultFiltered.orderBy(orderBy);
    }

    if (Object.keys(filter).length > 0) {
      resultFiltered = resultFiltered.filter(filter);
    }

    resultFiltered = resultFiltered.take(offset - index);

    return resultFiltered.value();
  }

  /**
   * Returned a connection from
   * array
   */
  toConnectionArray(args) {
    const results = this.toArray();
    return connectionFromArray(results, args);
  }

  /**
   * Limit
   * @param limit
   * @returns {LoaderFilter}
   */
  limit(limit) {
    this.filtering.limit = limit || this.filtering.limit;
    return this;
  }

  /**
   * Set order by
   * @param field
   * @param direction
   */
  orderBy(field, direction) {
    this.filtering.orderBy[field] = direction;
    return this;
  }

  /**
   *
   * @param filterDef
   */
  filter(filterDef) {
    this.filtering.filter = {
      ...this.filtering.filter,
      ...filterDef
    };
    return this;
  }

  /**
   * Filter if helper
   * @param condition
   * @param filter
   * @returns {LoaderFilter}
   */
  filterIf(condition, filter) {
    return this.if(condition, () => this.filter(filter));
  }

  /**
   * Sometime we use optional
   * arguments into our GraphQL queries
   * to keep the chain of filters
   * we use this function to evaluate
   * any filtering if the value is not
   * undefined
   * @param value
   * @param fnEvaluation
   * @returns {LoaderFilter}
   */
  if(value, fnEvaluation) {
    if (value !== undefined) {
      fnEvaluation(this);
      return this;
    }
    return this;
  }

  /**
   * From node args
   *
   * @param args
   * @returns {LoaderFilter}
   */
  fromNodeArgs(args) {
    this.filter(args.filter);

    this.if(args.order, () => {
      this.orderBy.apply(this, args.order);
    });

    this.limit(args.limit);

    return this;
  }
}

export default LoaderFilter;
