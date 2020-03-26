import parser from './parser'
import htmlize from './htmlize'

export default (markdown) => {
  const node = parser(markdown)
  return htmlize(node)
}
