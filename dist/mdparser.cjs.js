'use strict';

class Node {
  // args: { type, start, end, elts }
  constructor(...args) {
    this.type = args[0];
    this.start = args[1];
    this.end = args[2];
    this.elts = args[3] || [];
    this.ctx = args[4] || [];
  }
}

const isPhantom = (node) => node.type === 'phantom';
const isWhitespace = (node) => node.type === 'whitespace';
// export const isOp = (node) => node.type === 'op'
const isToken = (node) => node.type === 'token';

const EOF = 'EOF';
const _op_ = ['*', '_', '~', '+'];
const _whitespaces_ = [' ', '\n'];

const startWith = (s, start, prefix) => {
  const len = prefix.length;
  const end = start + len;

  if (len === 0) { return false }
  if (s.length < end) { return false }
  if (s.slice(start, end) === prefix) { return prefix }

  return false
};

const startWithOneOf = (s, start, prefixs) => {
  for (let i = 0; i < prefixs.length; i++) {
    const prefix = prefixs[i];
    if (startWith(s, start, prefix)) {
      return prefix
    }
  }

  return false
};

const findOp = (s, start) => {
  return startWithOneOf(s, start, _op_)
};

const findWhitespace = (s, start) => {
  return startWithOneOf(s, start, _whitespaces_)
};

const scan = (s) => {
  const scan1 = (s, start) => {
    if (start === s.length) {
      return [EOF, start]
    }

    const whitespace = findWhitespace(s, start);
    if (whitespace) {
      const end = start + whitespace.length;
      const tok = new Node('whitespace', start, end, whitespace);
      return [tok, end]
    }

    const op = findOp(s, start);
    if (op) {
      const end = start + op.length;
      const tok = new Node('op', start, end, op);
      return [tok, end]
    }

    // else, identifier or number
    const iter = (pos) => {
      if (s.length <= pos ||
        findWhitespace(s, pos) ||
        findOp(s, pos)
      ) {
        const substring = s.slice(start, pos);
        const t = new Node('token', start, pos, substring);
        return [t, pos]
      } else {
        return iter(pos + 1)
      }
    };

    return iter(start)
  };

  const iter = (start, toks) => {
    // return scan1(s, start)
    const [tok, newStart] = scan1(s, start);
    // if (!newStart) {
    //   return
    // }

    if (tok === EOF) {
      return toks
    } else {
      return iter(newStart, toks.concat([tok]))
    }
  };

  return iter(0, [])
};

const isNull = (arr) => {
  return arr.length === 0
};

const car = (arr) => {
  if (arr.length === 0) { throw new Error('CAR -- Can nor car null') }
  return arr[0]
};

const cdr = (arr) => {
  if (arr.length === 0) { throw new Error('CDR -- Can not cdr null') }
  return arr.slice(1)
};

const cons = (item, arr) => {
  return [item, ...arr]
};

const merge = (...arrList) => {
  return arrList.reduce((arr1, arr2) => {
    return arr1.concat(arr2)
  }, [])
};

const last = (arr) => {
  return arr[arr.length - 1]
};

const applyCheck = (p, toks, ctx) => {
  const a = p(toks, ctx);
  return a
};

const _seq = (...ps) => {
  return (toks, ctx) => {

    const loop = (ps, toks, nodes) => {
      if (isNull(ps)) {
        return [nodes, toks]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx);
        if (!t) {
          return [false, false]
        } else {
          return loop(cdr(ps), r, merge(nodes, t))
        }
      }
    };

    return loop(ps, toks, [])
  }
};

// removes phantoms
const _seqP = (...ps) => {
  const parser = _seq(...ps);
  return (toks, ctx) => {
    const [t, r] = applyCheck(parser, toks, ctx);
    if (!t) {
      return [false, false]
    } else {
      return [t.filter((tok) => {
        return !isPhantom(tok)
      }), r]
    }
  }
};

const _or = (...ps) => {
  return (toks, ctx) => {
    const loop = (ps) => {
      if (isNull(ps)) {
        return [false, false]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx);
        if (!t) {
          return loop(cdr(ps))
        } else {
          return [t, r]
        }
      }
    };

    return loop(ps)
  }
};

const _and = (...ps) => {
  return (toks, ctx) => {

    const loop = (ps, res) => {
      if (isNull(ps)) {
        const r1 = car(res);
        return [car(r1), car(cdr(r1))]
      } else {
        const [t, r] = applyCheck(car(ps), toks, ctx);
        if (!t) {
          return [false, false]
        } else {
          return loop(cdr(ps), cons([t, r], res))
        }
      }
    };
    return loop(ps, [])
  }
};

const _negation = (...ps) => {
  const parser = _seqP(...ps);
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx);
    if (!t && !isNull(toks)) {
      return [[car(toks)], cdr(toks)]
    } else {
      return [false, false]
    }
  }
};

const _all = (...ps) => {
  const parser = _seqP(...ps);
  return (toks, ctx) => {
    const loop = (toks, nodes) => {
      if (isNull(toks)) {
        return [nodes, []]
      } else {
        const [t, r] = parser(toks, ctx);
        if (!t) {
          return [nodes, toks]
        } else {
          return loop(r, merge(nodes, t))
        }
      }
    };

    return loop(toks, [])
  }
};

const _type = (type, ...ps) => {
  const parser = _seq(...ps);
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx);
    if (!t) {
      return [false, false]
    }
    if (!type) {
      return [t.filter((tok) => {
        return !isPhantom(tok)
      }), r]
    }
    if (isNull(t)) {
      const { start } = car(toks);
      return [[new Node(type, start, start, [])], r]
    }
    return [[new Node(type, car(t).start, last(t).end, t)], r]
  }
};

const _plus = (...ps) => {
  const p = _seqP(...ps);
  return _seqP(p, _all(p))
};

const $phantom = (...ps) => {
  const parser = _seqP(...ps);
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx);
    if (!t) {
      return [false, false]
    }
    if (isNull(t)) {
      return [[], r]
    }
    return [[new Node('phantom', car(t).start, last(t).end, [])], r]
  }
};

const $pred = (proc) => {
  return (toks, ctx) => {
    if (isNull(toks)) {
      return [false, false]
    }
    if (proc(car(toks))) {
      return [[car(toks)], cdr(toks)]
    }
    return [false, false]
  }
};

const $$ = (s) => {
  return $pred((x) => {
    return x.elts === s
  })
};

const $_ = (s) => {
  const a = $phantom($$(s));
  return a
};

const _seprate_ = (p, sep) => {
  return _seq(p, _all(sep, p))
};

const $eval = (p, str) => {
  const toks = scan(str);
  const [t] = p(toks, []);
  return t
};

const HTMLIZE_MAP = {
  'empthsis': (str) => `<i>${str}</i>`,
  'underline': (str) => `<u>${str}</u>`,
  'strong': (str) => `<strong>${str}</strong>`,
  'strike': (str) => `<strike>${str}</strike>`,
};

const htmlize = (node) => {
  let inner;
  if (Array.isArray(node.elts)) {
    inner = node.elts.map(htmlize).reduce((a, b) => a + b, '');
  } else {
    inner = node.elts;
  }

  const fn = HTMLIZE_MAP[node.type];
  if (!fn) { return inner }
  else { return fn(inner) }
};

const $strongOp = _seq($_('*'), $_('*'));
const $str2Op = _seq($_('_'), $_('_'));
const $empOp = $_('*');
const $emp2Op = $_('_');
const $strikeOp = _seq($_('~'), $_('~'));
const $underOp = _seq($_('+'), $_('+'));

const defineRange = (type, op) => {
  const e1 = _and(_negation(op), $ttok);
  const e2 = _seqP(op, _plus(e1), op);
  return _type(type, e2)
};

const $strong = (toks, ctx) => {
  const parser = defineRange('strong', $strongOp);
  return parser(toks, ctx)
};

const $str2 = (toks, ctx) => {
  const parser = defineRange('str2', $str2Op);
  return parser(toks, ctx)
};

const $emphisis = (toks, ctx) => {
  const parser = defineRange('empthsis', $empOp);
  return parser(toks, ctx)
};

const $emp2 = (toks, ctx) => {
  const parser = defineRange('emp2', $emp2Op);
  return parser(toks, ctx)
};

const $strike = (toks, ctx) => {
  const parser = defineRange('strike', $strikeOp);
  return parser(toks, ctx)
};

const $underline = (toks, ctx) => {
  const parser = defineRange('underline', $underOp);
  return parser(toks, ctx)
};

const $whitespace = $pred((node) => isWhitespace(node));
const $tok = $pred((node) => isToken(node));
const $strikeTok = $$('~');
const $empTok = $$('*');
const $emp2Tok = $$('_');
const $underTok = $$('+');

const $ttok = _or(
  $tok,
  $underline,
  $strike,
  $strong,
  $str2,
  $emphisis,
  $emp2,
  $strikeTok,
  $empTok,
  $emp2Tok,
  $underTok,
);

const $sexp = _seprate_($ttok, _all($whitespace));
const $all = _or(
  _seq(_all($whitespace), $sexp, _all($whitespace)),
  _all($whitespace),
);

var index = (str) => {
  const toks = $eval($all, str);
  const node = new Node('body', 0, -1, toks);
  return htmlize(node)
};

module.exports = index;
