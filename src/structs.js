export class Node {
  // args: { type, start, end, elts }
  constructor(...args) {
    this.type = args[0]
    this.start = args[1]
    this.end = args[2]
    this.elts = args[3] || []
    this.ctx = args[4] || []
  }
}

export const isPhantom = (node) => node.type === 'phantom'
export const isWhitespace = (node) => node.type === 'whitespace'
// export const isOp = (node) => node.type === 'op'
export const isToken = (node) => node.type === 'token'
