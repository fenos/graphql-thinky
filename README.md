# graphql-thinky

![graphql-thinky-logo](http://www.cagacaga.com/fab_full_big_dark.png)

[![Build Status](https://travis-ci.org/fenos/graphql-thinky.svg?branch=master)](https://travis-ci.org/fenos/graphql-thinky) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/fenos/graphql-thinky/master/LICENSE) [![npm](https://img.shields.io/badge/npm-0.1.6-blue.svg)](https://www.npmjs.com/package/graphql-thinky)

Graphql-thinky helps you to construct your GraphQL schema and the communication layer to a RethinkDB backend. It will perform **batched** and **optimised** queries, during graphql requests. the library is powered by the fantastic thinky ORM and Graphql / RelayJS which rely on.

Inspired by the great [graphql-sequelize](https://github.com/mickhansen/graphql-sequelize). If you have a SQLs application i suggest to look at it.  

###Documentation
You can find it here: [https://graphql-thinky.readme.io](https://graphql-thinky.readme.io)

Example: [Here](https://github.com/fenos/graphql-thinky/tree/master/example)

### Milestone

This library has been just backed with :heartpulse:  and with in it's early version can already provide pleasure to build your own GraphQL schema; although it needs the **community support** to grow and evolve to achieve the **v1.0**.

Here is the features not yet implemented, that i'm willing to add over the time.

- **Subscription** helpers for graphql, so that we can fully use RethinkDB amazing **change feed**
- **Mutation** helpers, to allow create simple mutation in few lines
- Custom query overwrites - to allow the developer to extend the default query behaviour of **graphql-thinky** on every Node.
- Increase test case coverage
- and much more when new feature are requested from the folks...

### Contribution

To contribute to the repo, you can do it in few ways:

- **Bugs**: Open a issue into github, add the test case to reproduce the bug (if possible)
- **New features**: Open an issue into github, explain the needs of the feature once the feature is agreed i will happy to receive Pull request with related tests cases, if you can't do that I'll try to help for the implementation.

**Note**: As the repository grow we will add more strict guidelines for contribution


### Credits

##### I want to thanks the technologies that allowed **graphql-thinky** to be built. Here the links

- [Thinky](http://thinky.io)
- [GraphQL](http://graphql.org)
- [RelayJs](https://facebook.github.io/relay)
- [RethinkDB](http://www.rethinkdb.com/)
- [graphql-sequelize](https://github.com/mickhansen/graphql-sequelize)
- [ava](https://github.com/avajs/ava)
- [babel](https://babeljs.io)
- And all the entire MIT projects communities 

##### Folks & contributors of the repo

**Developers**
- Me: [fenos](https://github.com/fenos/graphql-thinky)


**Doc Design and Logo**:
- [Tan](https://github.com/slow-motion)
- [Fatos](https://www.behance.net/roza)
