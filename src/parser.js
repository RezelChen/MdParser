import {
  _seq, _seqP, _or, _and, _negation, _all, _type, _plus,
  $pred, $$, $_, _seprate_,
} from './combinator'
import { isWhitespace, isToken } from './structs'

const $whitespace = $pred((node) => isWhitespace(node))
const $tok = $pred((node) => isToken(node))
const $symbol = _or($$('~'), $$('*'), $$('_'), $$('+'))
const $strikeOp = _seq($_('~'), $_('~'))
const $underlineOp = _seq($_('+'), $_('+'))
const $strongOp1 = _seq($_('*'), $_('*'))
const $strongOp2 = _seq($_('_'), $_('_'))
const $emphasisOp1 = $_('*')
const $emphasisOp2 = $_('_')

const defineRange = (type, op) => {
  const e1 = _and(_negation(op), $ttok)
  const e2 = _seqP(op, _plus(e1), op)
  return _type(type, e2)
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

const $ttok = _or(
  $tok,
  $strike,
  $underline,
  $strong,
  $emphasis,
  $symbol,
)

const $sexp = _seprate_($ttok, _all($whitespace))
const $all = _or(
  _seq(_all($whitespace), $sexp, _all($whitespace)),
  _all($whitespace),
)

export default $all
