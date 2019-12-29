class Node {
  // args: { type, start, end, elts }
  constructor(...args) {
    this.type = args[0]
    this.start = args[1]
    this.end = args[2]
    this.elts = args[3] || []
    this.ctx = args[4] || []
  }
}

exports.isPhantom = (node) => node.type === 'phantom'
exports.isWhitespace = (node) => node.type === 'whitespace'
// exports.isOp = (node) => node.type === 'op'
exports.isToken = (node) => node.type === 'token'

exports.Node = Node
