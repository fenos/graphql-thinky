import {chain} from 'lodash';
import {
  connectionFromArray,
} from 'graphql-relay';

class LoaderFilter {

  constructor(results) {
    this.results = results;
    this.filtering = {
      limit: 40,
      orderBy: {},
      filters: [],
      paginate: null,
    };
  }

  /**
   * Resolve results with filtering
   * applyed
   * @returns {Array|*}
   */
  resolve() {
    const {limit, orderBy, filters} = this.filtering;
    let resultFiltered = chain(this.results);

    if (Object.keys(orderBy).length > 0) {
      resultFiltered = resultFiltered.orderBy(orderBy);
    }

    if (filters.length > 0) {
      filters.forEach(filter => {
        resultFiltered = resultFiltered.filter(filter);
      });
    }

    if (limit) {
      resultFiltered = resultFiltered.take(limit);
    }

    return resultFiltered.value();
  }

  /**
   * Returned a connection from
   * array
   */
  connection(args) {
    const results = this.resolve();
    return connectionFromArray(results,args);
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
    this.filtering.filters.push(filterDef);
    return this;
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
}

export default LoaderFilter;