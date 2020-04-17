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
export const isNewline = (node) => node.type === 'newline'
export const isWhitespace = (node) => node.type === 'whitespace'
export const isToken = (node) => node.type === 'token'

const NUMBER = '0123456789'
export const isNumber = (node) => {
  if (!isToken(node)) { return false }
  if (node.elts.length === 0) { return false }
  return node.elts.split('').every((c) => NUMBER.includes(c))
}
