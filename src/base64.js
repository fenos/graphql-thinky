/**
 * Base 64
 *
 * @param i
 */
export function base64(i) {
	return (new Buffer(i, 'ascii')).toString('base64');
}

/**
 * Unbase 64
 *
 * @param i
 */
export function unbase64(i) {
	return (new Buffer(i, 'base64')).toString('ascii');
}
