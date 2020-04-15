import { Node } from './structs'

const EOF = 'EOF'
const NEWLINES = ['\n']
const WHITESPACES = [' ']
const DELIMS = ['*', '_', '~', '+', '#', '[', ']', '(', ')', '!', '-']

const startWith = (s, start, prefix) => {
  const len = prefix.length
  const end = start + len

  if (len === 0) { return false }
  if (s.length < end) { return false }
  if (s.slice(start, end) === prefix) { return prefix }

  return false
}

const startWithOneOf = (s, start, prefixes) => {
  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i]
    if (startWith(s, start, prefix)) {
      return prefix
    }
  }

  return false
}

const findNewline = (s, start) =>  startWithOneOf(s, start, NEWLINES)
const findWhitespace = (s, start) => startWithOneOf(s, start, WHITESPACES)
const findDelim = (s, start) => startWithOneOf(s, start, DELIMS)

const scan = (s) => {
  const scan1 = (s, start) => {
    if (start === s.length) {
      return [EOF, start]
    }

    const newline = findNewline(s, start)
    if (newline) {
      const end = start + newline.length
      const tok = new Node('newline', start, end, newline)
      return [tok, end]
    }

    const whitespace = findWhitespace(s, start)
    if (whitespace) {
      const end = start + whitespace.length
      const tok = new Node('whitespace', start, end, whitespace)
      return [tok, end]
    }

    const delim = findDelim(s, start)
    if (delim) {
      const end = start + delim.length
      const tok = new Node('delim', start, end, delim)
      return [tok, end]
    }

    // else, identifier or number
    const iter = (pos) => {
      if (s.length <= pos ||
        findNewline(s, pos) ||
        findWhitespace(s, pos) ||
        findDelim(s, pos)
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
