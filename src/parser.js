import {
  _seq, _seqP, _or, _and, _negation, _all, _type, _plus,
  $pred, $glob, $$, $_, _seprate_, $ctx, $out, $phantom, _maybe,
} from './combinator'
import { isNewline, isWhitespace, isToken } from './structs'

const $newline = $pred(isNewline)
const $whitespace = $pred(isWhitespace)
const $tok = $pred(isToken)
const $white = _all($whitespace)

const $tilde = $$('~')
const $star = $$('*')
const $plus = $$('+')
const $dash = $$('-')
const $under = $$('_')
const $sharp = $$('#')
const $exclam = $$('!')
const $leftParentheses = $$('(')
const $rightParentheses = $$(')')
const $leftBracket = $$('[')
const $rightBracket = $$(']')

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
)

const $strikeOp = _seq($tilde, $tilde)
const $underlineOp = _seq($plus, $plus)
const $strongOp1 = _seq($star, $star)
const $strongOp2 = _seq($under, $under)
const $itemOp = _or($star, $plus, $dash)
const $headOp = $sharp

const defineRange = (range, $op) => {
  $op = $phantom($op)
  // define a range in here
  const $range = $ctx(range, $op, $exps, $op)
  // use $out here to aviod recursive call
  return $out(range, $range)
}

const defineRange1 = (range, $op, $ed) => {
  $op = $phantom($op)
  $ed = $phantom($ed)
  return $ctx(range, $op, $exps, $ed)
}

const defineRange0 = (range, $op, $ed) => {
  $op = $phantom($op)
  $ed = $phantom($ed)
  return $ctx(range, $op, $texts, $ed)
}

const defineHeader = (layer) => {
  const $ops = []
  for (let i = 0; i < layer; i++) { $ops.push($headOp) }
  return $glob($white, ...$ops, $white)
}

const $strike = (toks, ctx) => {
  const parser = _type('strike', defineRange('~~', $strikeOp))
  return parser(toks, ctx)
}

const $underline = (toks, ctx) => {
  const parser = _type('underline', defineRange('++', $underlineOp))
  return parser(toks, ctx)
}

const $strong = (toks, ctx) => {
  const p1 = _type('strong', defineRange('**', $strongOp1))
  const p2 = _type('strong', defineRange('__', $strongOp2))
  return _or(p1, p2)(toks, ctx)
}

const $emphasis = (toks, ctx) => {
  const p1 = _type('emphasis', defineRange('*', $star))
  const p2 = _type('emphasis', defineRange('_', $under))
  return _or(p1, p2)(toks, ctx)
}

const $title = (toks, ctx) => {
  const p = _type('title', defineRange1(']', $leftBracket, $rightBracket))
  return p(toks, ctx)
}

const $url = (toks, ctx) => {
  const p = _type('url', defineRange0(')', $leftParentheses, $rightParentheses))
  return p(toks, ctx)
}

const $text = _or(
  $url,
  $title,
  $tok,
  $symbol,
)

const $texts = _seprate_($text, $white)

const $link = _type('link', $title, $url)
const $img = _type('img', $phantom($exclam), $title, $url)
const $exp = _or(
  $strike,
  $underline,
  $strong,
  $emphasis,
  $img,
  $link,
  $text,
)

const $exps = _seprate_($exp, $white)
const $lineBody = _seq($white, _maybe($exps, $white))
const $item = _type('item', $glob($itemOp, $white), $lineBody)
const $list = _type('list', _seprate_($item, _plus($newline)))
const $line = _or(
  _type('h6', defineHeader(6), $lineBody),
  _type('h5', defineHeader(5), $lineBody),
  _type('h4', defineHeader(4), $lineBody),
  _type('h3', defineHeader(3), $lineBody),
  _type('h2', defineHeader(2), $lineBody),
  _type('h1', defineHeader(1), $lineBody),
  _type('line', $lineBody),
)
const $lines = _seprate_(_or($list, $line), _plus($newline))
const $markdown = $lines

export default $markdown
