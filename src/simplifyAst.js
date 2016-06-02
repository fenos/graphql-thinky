/**
 * Deep merge
 *
 * @param a
 * @param b
 * @returns {*}
 */
function deepMerge(a, b) {
	Object.keys(b).forEach(key => {
		if (['fields', 'args'].indexOf(key) !== -1) {
			return;
		}

		if (a[key] && b[key] && typeof a[key] === 'object' && typeof b[key] === 'object') {
			a[key] = deepMerge(a[key], b[key]);
		} else {
			a[key] = b[key];
		}
	});

	if (a.fields && b.fields) {
		a.fields = deepMerge(a.fields, b.fields);
	} else if (a.fields || b.fields) {
		a.fields = a.fields || b.fields;
	}

	return a;
}

/**
 *
 * @param info
 * @returns {*|boolean}
 */
export function hasFragments(info) {
	return info.fragments && Object.keys(info.fragments).length > 0;
}

/**
 *
 * @param info
 * @param ast
 * @returns {*|boolean|*|boolean}
 */
export function isFragment(info, ast) {
	return hasFragments(info) && info.fragments[ast.name.value] && ast.kind !== 'FragmentDefinition';
}

/**
 *
 * @param ast
 * @param info
 * @param parent
 * @returns {*}
 */
export default function simplifyAST(ast, info, parent) {
	let selections;
	info = info || {};

	if (ast.selectionSet) {
		selections = ast.selectionSet.selections;
	}

	if (Array.isArray(ast)) {
		selections = ast;
	}

	if (isFragment(info, ast)) {
		return simplifyAST(info.fragments[ast.name.value], info);
	}

	if (!selections) {
		return {
			fields: {},
			args: {}
		};
	}

	return selections.reduce((simpleAST, selection) => {
		if (selection.kind === 'FragmentSpread' || selection.kind === 'InlineFragment') {
			simpleAST = deepMerge(
					simpleAST, simplifyAST(selection, info)
			);
			return simpleAST;
		}

		const name = selection.name.value,
			alias = selection.alias && selection.alias.value,
			key = alias || name;

		simpleAST.fields[key] = simpleAST.fields[key] || {};
		simpleAST.fields[key] = deepMerge(
				simpleAST.fields[key], simplifyAST(selection, info, simpleAST.fields[key])
		);

		if (alias) {
			simpleAST.fields[key].key = name;
		}

		simpleAST.fields[key].args = selection.arguments.reduce((args, arg) => {
			args[arg.name.value] = arg.value.value;
			return args;
		}, {});

		if (parent) {
			Object.defineProperty(simpleAST.fields[key], '$parent', {value: parent, enumerable: false});
		}

		return simpleAST;
	}, {
		fields: {},
		args: {}
	});
}
