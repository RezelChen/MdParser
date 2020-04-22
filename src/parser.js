import {
  _seq, _seqP, _or, _and, _negation, _all, _type, _plus,
  $pred, $glob, $$, $_, _separate_, $ctx, $out, $phantom, _maybe,
} from './combinator'
import { isNewline, isWhitespace, isToken, isNumber } from './structs'

const $newline = $phantom($pred(isNewline))
const $whitespace = $pred(isWhitespace)
const $tok = $pred(isToken)
const $number = $pred(isNumber)
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
const $dot = $$('.')
const $vert = $$('|')
const $arrow = $$('>')
const $colon = $$(':')
const $backQuote = $$('`')

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
)

const $strikeOp = _seq($tilde, $tilde)
const $underlineOp = _seq($plus, $plus)
const $strongOp1 = _seq($star, $star)
const $strongOp2 = _seq($under, $under)
const $itemOp = _or($star, $plus, $dash)
const $headOp = $sharp
const $codeOp = _seq($backQuote, $backQuote, $backQuote)

const defineRange = (range, $op, $content) => {
  $op = $phantom($op)
  // define a range in here
  const $range = $ctx(range, $op, $content, $op)
  // use $out here to avoid recursive call
  return $out(range, $range)
}

const defineTableLine = ($content) => {
  const range = '|'
  const $op = $phantom($vert)
  const $range = $ctx(range, _separate_($op, $content))
  return $out(range, $range)
}

const defineHeader = (layer) => {
  const $ops = []
  for (let i = 0; i < layer; i++) { $ops.push($headOp) }
  return $glob($white, ...$ops, $white)
}

const $strike = (toks, ctx) => {
  const parser = _type('strike', defineRange('~~', $strikeOp, $exps))
  return parser(toks, ctx)
}

const $underline = (toks, ctx) => {
  const parser = _type('underline', defineRange('++', $underlineOp, $exps))
  return parser(toks, ctx)
}

const $strong = (toks, ctx) => {
  const p1 = _type('strong', defineRange('**', $strongOp1, $exps))
  const p2 = _type('strong', defineRange('__', $strongOp2, $exps))
  return _or(p1, p2)(toks, ctx)
}

const $emphasis = (toks, ctx) => {
  const p1 = _type('emphasis', defineRange('*', $star, $exps))
  const p2 = _type('emphasis', defineRange('_', $under, $exps))
  return _or(p1, p2)(toks, ctx)
}

const $title = (toks, ctx) => {
  const $op = $phantom($leftBracket)
  const $ed = $phantom($rightBracket)
  const p = _type('title', $ctx(']', $op, $exps, $ed))
  return p(toks, ctx)
}

const $url = (toks, ctx) => {
  const $op = $phantom($leftParentheses)
  const $ed = $phantom($rightParentheses)
  const p = _type('url', $ctx(']', $op, $texts, $ed))
  return p(toks, ctx)
}

const $text = _or(
  $url,
  $title,
  $tok,
  $symbol,
)

const $texts = _separate_($text, $white)
const $textLine = _seq($white, _maybe($texts, $white))
const $newlineTok = $pred(isNewline)
const $textBlock = _seq(
  $glob($textLine), $newline,
  _separate_($textLine, $newlineTok),
)

const $code = _type('code', defineRange('`', $backQuote, $texts))
const $codeBlock = _type('code-block', defineRange('```', $codeOp, $textBlock))

const $link = _type('link', $title, $url)
const $img = _type('img', $phantom($exclam), $title, $url)
const $exp = _or(
  $strike,
  $underline,
  $strong,
  $emphasis,
  $code,
  $img,
  $link,
  $text,
)

const $exps = _separate_($exp, $white)
const $lineBody = _seq($white, _maybe($exps, $white))
const $item = _type('item', $glob($itemOp, _plus($whitespace)), $lineBody)
const $list = _type('list', _separate_($item, _plus($newline)))
const $quote = _type('quote', $phantom($arrow, $white), $lineBody)
const $orderItem = _type('oli', $glob($number, $dot, $white), $lineBody)
const $orderList = _type('ol', _separate_($orderItem, _plus($newline)))

const $th = _type('th', $lineBody)
const $td = _type('td', $lineBody)
const $splitOp = _or(
  _type('split-center', $colon, _plus($dash), $colon),
  _type('split-left', $colon, _plus($dash)),
  _type('split-right', _plus($dash), $colon),
  _type('split-default', _plus($dash)),
)
const $split = _seq($white, $splitOp, $white)

const $thRow = _type('tr', defineTableLine($th))
const $tdRow = _type('tr', defineTableLine($td))
const $splitRow = _type('sr', defineTableLine($split))

const $table = _type('table', 
  $thRow, $newline,
  $splitRow, $newline,
  _all(_separate_($tdRow, $newline)),
)

const $line = _or(
  _type('h6', defineHeader(6), $lineBody),
  _type('h5', defineHeader(5), $lineBody),
  _type('h4', defineHeader(4), $lineBody),
  _type('h3', defineHeader(3), $lineBody),
  _type('h2', defineHeader(2), $lineBody),
  _type('h1', defineHeader(1), $lineBody),
  _type('line', $lineBody),
)
const $lines = _separate_(_or($codeBlock, $table, $list, $orderList, $quote, $line), _plus($newline))
const $markdown = $lines

export default $markdown
