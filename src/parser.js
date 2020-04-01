import {
  _seq, _seqP, _or, _and, _negation, _all, _type, _plus,
  $pred, $$, $_, _seprate_,
} from './combinator'
import { isWhitespace, isToken } from './structs'

const $whitespace = $pred((node) => isWhitespace(node))
const $tok = $pred((node) => isToken(node))
const $strongOp = _seq($_('*'), $_('*'))
const $str2Op = _seq($_('_'), $_('_'))
const $empOp = $_('*')
const $emp2Op = $_('_')
const $strikeOp = _seq($_('~'), $_('~'))
const $underOp = _seq($_('+'), $_('+'))
const $strikeTok = $$('~')
const $empTok = $$('*')
const $emp2Tok = $$('_')
const $underTok = $$('+')

const defineRange = (type, op) => {
  const e1 = _and(_negation(op), $ttok)
  const e2 = _seqP(op, _plus(e1), op)
  return _type(type, e2)
}

const $strong = (toks, ctx) => {
  const parser = defineRange('strong', $strongOp)
  return parser(toks, ctx)
}

const $str2 = (toks, ctx) => {
  const parser = defineRange('str2', $str2Op)
  return parser(toks, ctx)
}

const $emphisis = (toks, ctx) => {
  const parser = defineRange('empthsis', $empOp)
  return parser(toks, ctx)
}

const $emp2 = (toks, ctx) => {
  const parser = defineRange('emp2', $emp2Op)
  return parser(toks, ctx)
}

const $strike = (toks, ctx) => {
  const parser = defineRange('strike', $strikeOp)
  return parser(toks, ctx)
}

const $underline = (toks, ctx) => {
  const parser = defineRange('underline', $underOp)
  return parser(toks, ctx)
}

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
)

const $sexp = _seprate_($ttok, _all($whitespace))
const $all = _or(
  _seq(_all($whitespace), $sexp, _all($whitespace)),
  _all($whitespace),
)

export default $all
