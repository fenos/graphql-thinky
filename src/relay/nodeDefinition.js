import {
    nodeDefinitions,
    fromGlobalId
} from 'graphql-relay';

import NodeMapper from './nodeMapper';

/**
 * Id Global Fetcher
 *
 * @param thinky
 * @param nodeTypeMapper
 * @returns {Function}
 */
export function idFetcher(Models, nodeTypeMapper) {
  return async(globalId, context) => {
    const {type, id} = fromGlobalId(globalId);

    const nodeType = nodeTypeMapper.item(type);
    if (nodeType && typeof nodeType.resolve === 'function') {
      const res = await Promise.resolve(nodeType.resolve(globalId, context));
      res.__graphqlType__ = type;
      return res;
    }

    const model = Object.keys(Models).find(model => model === type);

    let result = null;

    if (model) {
      result = await Models[model].get(id).run();
    } else {
      result = nodeType;
    }

    if (result) {
      return nodeType.type;
    }

    return result;
  };
}

/**
 * Type Resolver
 *
 * @param nodeTypeMapper
 * @returns {Function}
 */
export function typeResolver(nodeTypeMapper) {
  return obj => {
    const type = obj.__graphqlType__ ||
    (typeof obj.getModel === 'function') ?
        obj.getModel()._schema._model._name : obj.name;

    if (!type) {
      throw new Error(`Unable to determine type of ${typeof obj}. ` +
          `Either specify a resolve function in 'NodeTypeMapper' object, or specify '__graphqlType__' property on object.`);
    }

    const nodeType = nodeTypeMapper.item(type);
    return nodeType && nodeType.type || null;
  };
}

/**
 * Export node definitions
 *
 * @param Database
 * @returns {{nodeTypeMapper: NodeTypeMapper}}
 */
export function nodeInterfaceMapper(Models) {
  const nodeTypeMapper = new NodeMapper();
  const nodeObjects = nodeDefinitions(
      idFetcher(Models, nodeTypeMapper),
      typeResolver(nodeTypeMapper)
  );

  return {
    nodeTypeMapper,
    ...nodeObjects
  };
}
