const parser = require('./parser')

const transToNodes = (toks) => {
  const ctxTransform = (ctx) => {
    const result = {}

    ctx.forEach((c) => {
      switch (c) {
        case 'empthsis':
          result.fontStyle = 'italic'
          return
        case 'strong':
          result.fontWeight = 'bold'
          return
        case 'strike':
          if (result.textDecoration === undefined) {
            result.textDecoration = 'line-through'
          } else {
            result.textDecoration += ' line-through'
          }
          return
        case 'underline':
          if (result.textDecoration === undefined) {
            result.textDecoration = 'underline'
          } else {
            result.textDecoration += ' underline'
          }
          return
      }
    })
    return result
  }

  return toks.map((tok) => {
    const style = ctxTransform(tok.ctx)
    return {
      content: tok.elts,
      style
    }
  })
}

module.exports = (str) => {
  const toks = parser(str)
  return transToNodes(toks)
}
