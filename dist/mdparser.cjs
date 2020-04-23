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

const NUMBER = '0123456789';
const isNumber = (node) => {
  if (!isToken(node)) { return false }
  if (node.elts.length === 0) { return false }
  return node.elts.split('').every((c) => NUMBER.includes(c))
};

const EOF = 'EOF';
const NEWLINES = ['\n'];
const WHITESPACES = [' '];
const DELIMS = [
  '*', '_', '~', '+', '#',
  '!', '-', '.', '|', '>', ':', '`',
  '[', ']', '(', ')',
];

const startWith = (s, start, prefix) => {
  const len = prefix.length;
  const end = start + len;

  if (len === 0) { return false }
  if (s.length < end) { return false }
  if (s.slice(start, end) === prefix) { return prefix }

  return false
};

const startWithOneOf = (s, start, prefixes) => {
  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
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
  return p(toks, ctx)
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

const _separate_ = (p, sep) => {
  return _seq(p, _all(sep, p))
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

const $eval = (p, str) => {
  const toks = scan(str);
  const [t] = p(toks, []);
  return t
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
  'list': (str) => `<ul>${str}</ul>`,
  'oli': (str) => `<li>${str}</li>`,
  'ol': (str) => `<ol>${str}</ol>`,
  'table': (str) => `<table>${str}</table>`,
  'tr': (str) => `<tr>${str}</tr>`,
  'th': (str, attrs) => `<th ${attrs}>${str}</th>`,
  'td': (str, attrs) => `<td ${attrs}>${str}</td>`,
  'quote': (str) => `<blockquote>${str}</blockquote>`,
  'code': (str) => `<code>${str}</code>`,
  'code-block': (str) => `<pre><code>${str}</code></pre>`,
};

const REG = /[<>&"]/g;
const REPLACE = {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'};
const escape = (str) => str.replace(REG, (c) => REPLACE[c]);
const htmlizeList = (elts) => {
  if (Array.isArray(elts)) { return elts.map(htmlize).reduce((a, b) => a + b, '') }
  else { return escape(elts) }
};

const getSplitAlign = (node) => {
  switch (node.type) {
    case 'split-center': return 'center'
    case 'split-left': return 'left'
    case 'split-right': return 'right'
    default: return null
  }
};

const htmlizeWithAlign = (node, align) => {
  const attrs = align ? `align=${align}` : '';
  // almost the same as default in htmlize
  const inner = htmlizeList(node.elts);
  const fn = HTMLIZE_MAP[node.type];
  if (!fn) { return inner }
  else { return fn(inner, attrs) }
};

const htmlizeTr = (tr, aligns) => {
  const inner = tr.elts
    .map((node, i) => htmlizeWithAlign(node, aligns[i]))
    .reduce((a, b) => a + b, '');
  return `<tr>${inner}</tr>`
};

const htmlize = (node) => {

  switch (node.type) {
    case 'img': {
      const [title, url] = node.elts;
      const titleInner = htmlizeList(title.elts);
      const urlInner = htmlizeList(url.elts);
      return `<img src="${urlInner}" title="${titleInner}" style="max-width: 100%" />`
    }
    case 'link': {
      const [title, url] = node.elts;
      const titleInner = htmlizeList(title.elts);
      const urlInner = htmlizeList(url.elts);
      return `<a href="${urlInner}">${titleInner}</a>`
    }
    case 'table': {
      const [tr, sr, ...trs] = node.elts;
      const aligns = sr.elts.map(getSplitAlign);
      const thRow = htmlizeTr(tr, aligns);
      const tdRows = trs.map((tr) => htmlizeTr(tr, aligns));
      const inner = [thRow, ...tdRows].reduce((a, b) => a + b, '');
      return `<table>${inner}</table>`
    }
    default: {
      const inner = htmlizeList(node.elts);
      const fn = HTMLIZE_MAP[node.type];
      if (!fn) { return inner }
      else { return fn(inner) }
    }
  }
};

const $newline = $phantom($pred(isNewline));
const $whitespace = $pred(isWhitespace);
const $tok = $pred(isToken);
const $number = $pred(isNumber);
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
const $dot = $$('.');
const $vert = $$('|');
const $arrow = $$('>');
const $colon = $$(':');
const $backQuote = $$('`');

const $symbol = _or(
  $out('`', $out('```', $backQuote)),
  $out('~', $out('~~', $tilde)),
  $out('*', $out('**', $star)),
  $out('+', $out('++', $plus)),
  $out('_', $out('__', $under)),
  $out('(', $leftParentheses),
  $out(')', $rightParentheses),
  $out('[', $leftBracket),
  $out(']', $rightBracket),
  $out('|', $vert),
  $dash,
  $sharp,
  $exclam,
  $dot,
  $arrow,
  $colon,
);

const $strikeOp = _seq($tilde, $tilde);
const $underlineOp = _seq($plus, $plus);
const $strongOp1 = _seq($star, $star);
const $strongOp2 = _seq($under, $under);
const $itemOp = _or($star, $plus, $dash);
const $headOp = $sharp;
const $codeOp = _seq($backQuote, $backQuote, $backQuote);

const defineRange = (range, $op, $content) => {
  $op = $phantom($op);
  // define a range in here
  const $range = $ctx(range, $op, $content, $op);
  // use $out here to avoid recursive call
  return $out(range, $range)
};

const defineTableLine = ($content) => {
  const range = '|';
  const $op = $phantom($vert);
  const $range = $ctx(range, _separate_($op, $content));
  return $out(range, $range)
};

const defineHeader = (layer) => {
  const $ops = [];
  for (let i = 0; i < layer; i++) { $ops.push($headOp); }
  return $glob($white, ...$ops, $white)
};

const $strike = (toks, ctx) => {
  const parser = _type('strike', defineRange('~~', $strikeOp, $exps));
  return parser(toks, ctx)
};

const $underline = (toks, ctx) => {
  const parser = _type('underline', defineRange('++', $underlineOp, $exps));
  return parser(toks, ctx)
};

const $strong = (toks, ctx) => {
  const p1 = _type('strong', defineRange('**', $strongOp1, $exps));
  const p2 = _type('strong', defineRange('__', $strongOp2, $exps));
  return _or(p1, p2)(toks, ctx)
};

const $emphasis = (toks, ctx) => {
  const p1 = _type('emphasis', defineRange('*', $star, $exps));
  const p2 = _type('emphasis', defineRange('_', $under, $exps));
  return _or(p1, p2)(toks, ctx)
};

const $title = (toks, ctx) => {
  const $op = $phantom($leftBracket);
  const $ed = $phantom($rightBracket);
  const p = _type('title', $ctx(']', $op, $exps, $ed));
  return p(toks, ctx)
};

const $url0 = (toks, ctx) => {
  const $op = $phantom($leftParentheses);
  const $ed = $phantom($rightParentheses);
  const p = _type('url', $ctx(')', $op, $exps, $ed));
  return p(toks, ctx)
};

const $url1 = (toks, ctx) => {
  const $op = $phantom($leftParentheses);
  const $ed = $phantom($rightParentheses);
  const p = _type('url', $ctx(')', $op, $texts, $ed));
  return p(toks, ctx)
};

const $text = _or(
  $url1,
  $title,
  $tok,
  $symbol,
);

const $texts = _separate_($text, $white);
const $textLine = _seq($white, _maybe($texts, $white));
const $newlineTok = $pred(isNewline);
const $textBlock = _seq(
  $glob($textLine), $newline,
  _separate_($textLine, $newlineTok),
);

const $code = _type('code', defineRange('`', $backQuote, $texts));
const $codeBlock = _type('code-block', defineRange('```', $codeOp, $textBlock));

const $link = _type('link', $title, $url1);
const $img = _type('img', $phantom($exclam), $title, $url1);
const $exp = _or(
  $strike,
  $underline,
  $strong,
  $emphasis,
  $code,
  $img,
  $link,
  $url0,
  $text,
);

const $exps = _separate_($exp, $white);
const $lineBody = _seq($white, _maybe($exps, $white));
const $item = _type('item', $glob($itemOp, _plus($whitespace)), $lineBody);
const $list = _type('list', _separate_($item, _plus($newline)));
const $quote = _type('quote', $phantom($arrow, $white), $lineBody);
const $orderItem = _type('oli', $glob($number, $dot, $white), $lineBody);
const $orderList = _type('ol', _separate_($orderItem, _plus($newline)));

const $th = _type('th', $lineBody);
const $td = _type('td', $lineBody);
const $splitOp = _or(
  _type('split-center', $colon, _plus($dash), $colon),
  _type('split-left', $colon, _plus($dash)),
  _type('split-right', _plus($dash), $colon),
  _type('split-default', _plus($dash)),
);
const $split = _seq($white, $splitOp, $white);

const $thRow = _type('tr', defineTableLine($th));
const $tdRow = _type('tr', defineTableLine($td));
const $splitRow = _type('sr', defineTableLine($split));

const $table = _type('table', 
  $thRow, $newline,
  $splitRow, $newline,
  _all(_separate_($tdRow, $newline)),
);

const $line = _or(
  _type('h6', defineHeader(6), $lineBody),
  _type('h5', defineHeader(5), $lineBody),
  _type('h4', defineHeader(4), $lineBody),
  _type('h3', defineHeader(3), $lineBody),
  _type('h2', defineHeader(2), $lineBody),
  _type('h1', defineHeader(1), $lineBody),
  _type('line', $lineBody),
);
const $lines = _separate_(_or($codeBlock, $table, $list, $orderList, $quote, $line), _plus($newline));
const $markdown = $lines;

var index = (str) => {
  const toks = $eval($markdown, str);
  const node = new Node('body', 0, -1, toks);
  return htmlize(node)
};

module.exports = index;
