import test from 'ava';
import simplifyAST from '../../src/simplifyAst';
import {parse as parser} from 'graphql/language/parser';
import {expect} from 'chai';

const parse = function (query) {
  return parser(query).definitions[0];
};

test('should simplify a basic nested structure', () => {
  expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            name
          }
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      users: {
        args: {},
        fields: {
          name: {
            args: {},
            fields: {}
          },
          projects: {
            args: {},
            fields: {
              name: {
                args: {},
                fields: {}
              }
            }
          }
        }
      }
    }
  });
});

test('should simplify a basic structure with args', () => {
  expect(simplifyAST(parse(`
      {
        user(id: 1) {
          name
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      user: {
        args: {
          id: "1"
        },
        fields: {
          name: {
            args: {},
            fields: {}
          }
        }
      }
    }
  });
});

test('should simplify a basic structure with an inline fragment', () => {
  expect(simplifyAST(parse(`
      {
        user {
          ... on User {
            name
          }
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      user: {
        args: {},
        fields: {
          name: {
            args: {},
            fields: {}
          }
        }
      }
    }
  });
});

test('should expose a $parent', () => {
  var ast = simplifyAST(parse(`
      {
        users {
          name
          projects(first: 1) {
            nodes {
              name
            }
          }
        }
      }
    `));
  
  expect(ast.fields.users.fields.projects.fields.nodes.$parent).to.be.ok;
  expect(ast.fields.users.fields.projects.fields.nodes.$parent.args).to.deep.equal({
    first: '1'
  });
});

test('should simplify a nested structure at the lowest level', () => {
  expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            node {
              name
            }
            node {
              id
            }
          }
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      users: {
        args: {},
        fields: {
          name: {
            args: {},
            fields: {}
          },
          projects: {
            args: {},
            fields: {
              node: {
                args: {},
                fields: {
                  name: {
                    args: {},
                    fields: {}
                  },
                  id: {
                    args: {},
                    fields: {}
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});

test('should simplify a nested structure duplicated at a high level', () => {
  expect(simplifyAST(parse(`
      {
        users {
          name
          projects {
            node {
              name
            }
          }
          projects {
            node {
              id
            }
          }
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      users: {
        args: {},
        fields: {
          name: {
            args: {},
            fields: {}
          },
          projects: {
            args: {},
            fields: {
              node: {
                args: {},
                fields: {
                  name: {
                    args: {},
                    fields: {}
                  },
                  id: {
                    args: {},
                    fields: {}
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});

test('should simplify a structure with aliases', () => {
  expect(simplifyAST(parse(`
      {
        luke: human(id: "1000") {
          name
        }
        leia: human(id: "1003") {
          firstName: name
        }
      }
    `))).to.deep.equal({
    args: {},
    fields: {
      luke: {
        key: "human",
        args: {
          id: "1000"
        },
        fields: {
          name: {
            args: {},
            fields: {}
          }
        }
      },
      leia: {
        key: "human",
        args: {
          id: "1003"
        },
        fields: {
          firstName: {
            key: "name",
            args: {},
            fields: {}
          }
        }
      }
    }
  })
});