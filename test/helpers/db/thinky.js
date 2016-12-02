import thinky from 'thinky';

export default thinky({
  db: "think_graph_test_" + process.pid
});