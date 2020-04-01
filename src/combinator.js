import scan from './scanner'
import { Node, isPhantom } from './structs'
import { isNull, car, cdr, merge, last, cons } from './utils'

const applyCheck = (p, toks, ctx) => {
  const a = p(toks, ctx)
  return a
}

export const _seq = (...ps) => {
  return (toks, ctx) => {

    const loop = (ps, toks, nodes) => {
      if (isNull(ps)) {
        return [nodes, toks]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx)
        if (!t) {
          return [false, false]
        } else {
          return loop(cdr(ps), r, merge(nodes, t))
        }
      }
    }

    return loop(ps, toks, [])
  }
}

// removes phantoms
export const _seqP = (...ps) => {
  const parser = _seq(...ps)
  return (toks, ctx) => {
    const [t, r] = applyCheck(parser, toks, ctx)
    if (!t) {
      return [false, false]
    } else {
      return [t.filter((tok) => {
        return !isPhantom(tok)
      }), r]
    }
  }
}

export const _or = (...ps) => {
  return (toks, ctx) => {
    const loop = (ps) => {
      if (isNull(ps)) {
        return [false, false]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx)
        if (!t) {
          return loop(cdr(ps))
        } else {
          return [t, r]
        }
      }
    }

    return loop(ps)
  }
}

export const _and = (...ps) => {
  return (toks, ctx) => {

    const loop = (ps, res) => {
      if (isNull(ps)) {
        const r1 = car(res)
        return [car(r1), car(cdr(r1))]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx)
        if (!t) {
          return [false, false]
        } else {
          return loop(cdr(ps), cons([t, r], res))
        }
      }
    }
    return loop(ps, [])
  }
}

export const _negation = (...ps) => {
  const parser = _seqP(...ps)
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx)
    if (!t && !isNull(toks)) {
      return [[car(toks)], cdr(toks)]
    } else {
      return [false, false]
    }
  }
}

export const _all = (...ps) => {
  const parser = _seqP(...ps)
  return (toks, ctx) => {
    const loop = (toks, nodes) => {
      if (isNull(toks)) {
        return [nodes, []]
      } else {
        const [t, r] = parser(toks, ctx)
        if (!t) {
          return [nodes, toks]
        } else {
          return loop(r, merge(nodes, t))
        }
      }
    }

    return loop(toks, [])
  }
}

export const _type = (type, ...ps) => {
  const parser = _seq(...ps)
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx)
    if (!t) {
      return [false, false]
    }
    if (!type) {
      return [t.filter((tok) => {
        return !isPhantom(tok)
      }), r]
    }
    if (isNull(t)) {
      const { start } = car(toks)
      return [[new Node(type, start, start, [])], r]
    }
    return [[new Node(type, car(t).start, last(t).end, t)], r]
  }
}

export const _plus = (...ps) => {
  const p = _seqP(...ps)
  return _seqP(p, _all(p))
}

export const $phantom = (...ps) => {
  const parser = _seqP(...ps)
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx)
    if (!t) {
      return [false, false]
    }
    if (isNull(t)) {
      return [[], r]
    }
    return [[new Node('phantom', car(t).start, last(t).end, [])], r]
  }
}

export const $pred = (proc) => {
  return (toks, ctx) => {
    if (isNull(toks)) {
      return [false, false]
    }
    if (proc(car(toks))) {
      return [[car(toks)], cdr(toks)]
    }
    return [false, false]
  }
}

export const $$ = (s) => {
  return $pred((x) => {
    return x.elts === s
  })
}

export const $_ = (s) => {
  const a = $phantom($$(s))
  return a
}

export const _seprate_ = (p, sep) => {
  return _seq(p, _all(sep, p))
}

export const $eval = (p, str) => {
  const toks = scan(str)
  const [t] = p(toks, [])
  return t
}
