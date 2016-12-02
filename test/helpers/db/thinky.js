import thinky from 'thinky';

export default thinky({
  db: "think_graph_test_" + process.pid,
  host: '192.168.99.100',
  port: 32769
});