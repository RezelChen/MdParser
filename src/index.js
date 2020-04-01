import { $eval } from './combinator'
import htmlize from './htmlize'
import parser from './parser'
import { Node } from './structs'

export default (str) => {
  const toks = $eval(parser, str)
  const node = new Node('body', 0, -1, toks)
  return htmlize(node)
}
