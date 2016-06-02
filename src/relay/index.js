import {
		connectionFromArray
} from 'graphql-relay';

/**
 * Check if the type is a connection
 *
 * @param type
 * @returns {boolean|*}
 */
export function isConnection(type) {
	return typeof type.name !== 'undefined' && type.name.endsWith('Connection');
}

/**
 * Handle a connecton from array
 *
 * @param values
 * @param args
 */
export function handleConnection(values, args) {
	return connectionFromArray(values, args);
}

/**
 * Node ast
 *
 * @param connectionAST
 * @returns {*|connectionFields.edges|{type, description}|string|Function}
 */
export function nodeAST(connectionAST) {
	return connectionAST.fields.edges &&
			connectionAST.fields.edges.fields.node;
}

/**
 * Get node type
 *
 * @param connectionType
 * @returns {*}
 */
export function nodeType(connectionType) {
	return connectionType._fields.edges.type.ofType._fields.node.type;
}

/**
 * Export relay resolver.
 */
export resolveConnection from './resolver';
