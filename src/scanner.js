import { Node } from './structs'

const EOF = 'EOF'
const _op_ = ['*', '_', '~', '+']
const _whitespaces_ = [' ', '\n']

const startWith = (s, start, prefix) => {
  const len = prefix.length
  const end = start + len

  if (len === 0) { return false }
  if (s.length < end) { return false }
  if (s.slice(start, end) === prefix) { return prefix }

  return false
}

const startWithOneOf = (s, start, prefixs) => {
  for (let i = 0; i < prefixs.length; i++) {
    const prefix = prefixs[i]
    if (startWith(s, start, prefix)) {
      return prefix
    }
  }

  return false
}

const findOp = (s, start) => {
  return startWithOneOf(s, start, _op_)
}

const findWhitespace = (s, start) => {
  return startWithOneOf(s, start, _whitespaces_)
}

const scan = (s) => {
  const scan1 = (s, start) => {
    if (start === s.length) {
      return [EOF, start]
    }

    const whitespace = findWhitespace(s, start)
    if (whitespace) {
      const end = start + whitespace.length
      const tok = new Node('whitespace', start, end, whitespace)
      return [tok, end]
    }

    const op = findOp(s, start)
    if (op) {
      const end = start + op.length
      const tok = new Node('op', start, end, op)
      return [tok, end]
    }

    // else, identifier or number
    const iter = (pos) => {
      if (s.length <= pos ||
        findWhitespace(s, pos) ||
        findOp(s, pos)
      ) {
        const substring = s.slice(start, pos)
        const t = new Node('token', start, pos, substring)
        return [t, pos]
      } else {
        return iter(pos + 1)
      }
    }

    return iter(start)
  }

  const iter = (start, toks) => {
    // return scan1(s, start)
    const [tok, newStart] = scan1(s, start)
    // if (!newStart) {
    //   return
    // }

    if (tok === EOF) {
      return toks
    } else {
      return iter(newStart, toks.concat([tok]))
    }
  }

  return iter(0, [])
}

export default scan
