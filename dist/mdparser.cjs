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
const isNewline = (node) => node.type === 'newline';
const isWhitespace = (node) => node.type === 'whitespace';
const isToken = (node) => node.type === 'token';

const EOF = 'EOF';
const NEWLINES = ['\n'];
const WHITESPACES = [' '];
const DELIMS = ['*', '_', '~', '+', '#', '[', ']', '(', ')', '!', '-'];

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

const findNewline = (s, start) =>  startWithOneOf(s, start, NEWLINES);
const findWhitespace = (s, start) => startWithOneOf(s, start, WHITESPACES);
const findDelim = (s, start) => startWithOneOf(s, start, DELIMS);

const scan = (s) => {
  const scan1 = (s, start) => {
    if (start === s.length) {
      return [EOF, start]
    }

    const newline = findNewline(s, start);
    if (newline) {
      const end = start + newline.length;
      const tok = new Node('newline', start, end, newline);
      return [tok, end]
    }

    const whitespace = findWhitespace(s, start);
    if (whitespace) {
      const end = start + whitespace.length;
      const tok = new Node('whitespace', start, end, whitespace);
      return [tok, end]
    }

    const delim = findDelim(s, start);
    if (delim) {
      const end = start + delim.length;
      const tok = new Node('delim', start, end, delim);
      return [tok, end]
    }

    // else, identifier or number
    const iter = (pos) => {
      if (s.length <= pos ||
        findNewline(s, pos) ||
        findWhitespace(s, pos) ||
        findDelim(s, pos)
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
  if (arr.length === 0) { throw new Error('CAR -- Can not car null') }
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

const includes = (arr, item) => arr.includes(item);

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
  const parser = _seqP(...ps);
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx);
    if (!t) { return [false, false] }
    if (isNull(t)) {
      if (isNull(toks)) { return [false, false] }
      else {
        const { start } = car(toks);
        return [[new Node(type, start, start, [])], r]
      }
    }
    return [[new Node(type, car(t).start, last(t).end, t)], r]
  }
};

const _plus = (...ps) => {
  const p = _seqP(...ps);
  return _seqP(p, _all(p))
};

const _maybe = (...ps) => _or(_seqP(...ps), $none);

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

const $none = (toks, ctx) => [[], toks];

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

// parses the parsers ps normally
// but "globs" the parses and doesn't put them into the output.
const $glob = (...ps) => {
  const parser = _seq(...ps);
  return (toks, ctx) => {
    const [t, r] = parser(toks, ctx);
    if (!t) { return [false, false] }
    else { return [[], r] }
  }
};

const $$ = (s) => {
  const id = (x) => x.elts === s;
  return $pred(id)
};

const _seprate_ = (p, sep) => {
  return _seq(p, _all(sep, p))
};

const $eval = (p, str) => {
  const toks = scan(str);
  const [t] = p(toks, []);
  return t
};

const $ctx = (c, ...ps) => {
  const parser = _seqP(...ps);
  return (toks, ctx) => parser(toks, cons(c, ctx))
};

const $out = (c, ...ps) => {
  const parser = _seqP(...ps);
  return (toks, ctx) => {
    if (includes(ctx, c)) { return [false, false] }
    else { return parser(toks, ctx) }
  }
};

const HTMLIZE_MAP = {
  'emphasis': (str) => `<i>${str}</i>`,
  'underline': (str) => `<u>${str}</u>`,
  'strong': (str) => `<strong>${str}</strong>`,
  'strike': (str) => `<strike>${str}</strike>`,
  'line': (str) => `<p>${str}</p>`,
  'h1': (str) => `<h1>${str}</h1>`,
  'h2': (str) => `<h2>${str}</h2>`,
  'h3': (str) => `<h3>${str}</h3>`,
  'h4': (str) => `<h4>${str}</h4>`,
  'h5': (str) => `<h5>${str}</h5>`,
  'h6': (str) => `<h6>${str}</h6>`,
  'title': (str) => `[${str}]`,
  'url': (str) => `(${str})`,
  'item': (str) => `<li>${str}</li>`,
};

const htmlizeList = (elts) => {
  if (Array.isArray(elts)) { return elts.map(htmlize).reduce((a, b) => a + b, '') }
  else { return elts }
};

const htmlize = (node) => {

  switch (node.type) {
    case 'img': {
      const [title, url] = node.elts;
      const titleInner = htmlizeList(title.elts);
      const urlInner = htmlizeList(url.elts);
      return `<image src="${urlInner}" title="${titleInner}" style="width: 50%" />`
    }
    case 'link': {
      const [title, url] = node.elts;
      const titleInner = htmlizeList(title.elts);
      const urlInner = htmlizeList(url.elts);
      return `<a href="${urlInner}">${titleInner}</a>`
    }
    default: {
      const inner = htmlizeList(node.elts);
      const fn = HTMLIZE_MAP[node.type];
      if (!fn) { return inner }
      else { return fn(inner) }
    }
  }
};

const $newline = $pred(isNewline);
const $whitespace = $pred(isWhitespace);
const $tok = $pred(isToken);
const $white = _all($whitespace);

const $tilde = $$('~');
const $star = $$('*');
const $plus = $$('+');
const $dash = $$('-');
const $under = $$('_');
const $sharp = $$('#');
const $exclam = $$('!');
const $leftParentheses = $$('(');
const $rightParentheses = $$(')');
const $leftBracket = $$('[');
const $rightBracket = $$(']');

const $symbol = _or(
  $out('~', $out('~~', $tilde)),
  $out('*', $out('**', $star)),
  $out('+', $out('++', $plus)),
  $out('_', $out('__', $under)),
  $out('(', $leftParentheses),
  $out(')', $rightParentheses),
  $out('[', $leftBracket),
  $out(']', $rightBracket),
  $dash,
  $sharp,
  $exclam,
);

const $strikeOp = _seq($tilde, $tilde);
const $underlineOp = _seq($plus, $plus);
const $strongOp1 = _seq($star, $star);
const $strongOp2 = _seq($under, $under);
const $itemOp = _or($star, $plus, $dash);
const $headOp = $sharp;

const defineRange = (range, $op) => {
  $op = $phantom($op);
  // define a range in here
  const $range = $ctx(range, $op, $exps, $op);
  // use $out here to aviod recursive call
  return $out(range, $range)
};

const defineRange1 = (range, $op, $ed) => {
  $op = $phantom($op);
  $ed = $phantom($ed);
  return $ctx(range, $op, $exps, $ed)
};

const defineRange0 = (range, $op, $ed) => {
  $op = $phantom($op);
  $ed = $phantom($ed);
  return $ctx(range, $op, $texts, $ed)
};

const defineHeader = (layer) => {
  const $ops = [];
  for (let i = 0; i < layer; i++) { $ops.push($headOp); }
  return $glob($white, ...$ops, $white)
};

const $strike = (toks, ctx) => {
  const parser = _type('strike', defineRange('~~', $strikeOp));
  return parser(toks, ctx)
};

const $underline = (toks, ctx) => {
  const parser = _type('underline', defineRange('++', $underlineOp));
  return parser(toks, ctx)
};

const $strong = (toks, ctx) => {
  const p1 = _type('strong', defineRange('**', $strongOp1));
  const p2 = _type('strong', defineRange('__', $strongOp2));
  return _or(p1, p2)(toks, ctx)
};

const $emphasis = (toks, ctx) => {
  const p1 = _type('emphasis', defineRange('*', $star));
  const p2 = _type('emphasis', defineRange('_', $under));
  return _or(p1, p2)(toks, ctx)
};

const $title = (toks, ctx) => {
  const p = _type('title', defineRange1(']', $leftBracket, $rightBracket));
  return p(toks, ctx)
};

const $url = (toks, ctx) => {
  const p = _type('url', defineRange0(')', $leftParentheses, $rightParentheses));
  return p(toks, ctx)
};

const $text = _or(
  $url,
  $title,
  $tok,
  $symbol,
);

const $texts = _seprate_($text, $white);

const $link = _type('link', $title, $url);
const $img = _type('img', $phantom($exclam), $title, $url);
const $exp = _or(
  $strike,
  $underline,
  $strong,
  $emphasis,
  $img,
  $link,
  $text,
);

const $exps = _seprate_($exp, $white);
const $lineBody = _seq($white, _maybe($exps, $white));
const $line = _or(
  _type('h6', defineHeader(6), $lineBody),
  _type('h5', defineHeader(5), $lineBody),
  _type('h4', defineHeader(4), $lineBody),
  _type('h3', defineHeader(3), $lineBody),
  _type('h2', defineHeader(2), $lineBody),
  _type('h1', defineHeader(1), $lineBody),
  _type('item', $glob($itemOp, $white), $lineBody),
  _type('line', $lineBody),
);
const $lines = _seprate_($line, _plus($newline));
const $markdown = $lines;

var index = (str) => {
  const toks = $eval($markdown, str);
  const node = new Node('body', 0, -1, toks);
  return htmlize(node)
};

module.exports = index;
