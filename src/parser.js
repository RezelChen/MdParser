import {
  _seq, _seqP, _or, _and, _negation, _all, _type, _plus,
  $pred, $$, $_, _seprate_,
} from './combinator'
import { isNewline, isWhitespace, isToken } from './structs'

const $newline = $pred(isNewline)
const $whitespace = $pred(isWhitespace)
const $tok = $pred(isToken)

const $strikeOp = _seq($_('~'), $_('~'))
const $underlineOp = _seq($_('+'), $_('+'))
const $strongOp1 = _seq($_('*'), $_('*'))
const $strongOp2 = _seq($_('_'), $_('_'))
const $emphasisOp1 = $_('*')
const $emphasisOp2 = $_('_')

const defineRange = (type, $op) => {
  // TODO should negation the range, instead of $op
  const $e1 = _and(_negation($op), $exp)
  // TODO It's not a good place to define $exps in here
  // We hope to change the behavior of $exp, instead of make a new $exp in here
  // Maybe the ctx is still need to make $exp or powful
  const $exps = _seprate_($e1, _all($whitespace))
  return _type(type, $op, $exps, $op)
}

const $strike = (toks, ctx) => {
  const parser = defineRange('strike', $strikeOp)
  return parser(toks, ctx)
}

const $underline = (toks, ctx) => {
  const parser = defineRange('underline', $underlineOp)
  return parser(toks, ctx)
}

const $strong = (toks, ctx) => {
  const p1 = defineRange('strong', $strongOp1)
  const p2 = defineRange('strong', $strongOp2)
  return _or(p1, p2)(toks, ctx)
}

const $emphasis = (toks, ctx) => {
  const p1 = defineRange('emphasis', $emphasisOp1)
  const p2 = defineRange('emphasis', $emphasisOp2)
  return _or(p1, p2)(toks, ctx)
}

const $exp = _or(
  $strike,
  $underline,
  $strong,
  $emphasis,
  $tok,
)

const $line = _type('line', _seprate_(_all($whitespace), $exp))
const $lines = _seprate_($line, _plus($newline))
const $markdown = $lines

export default $markdown
