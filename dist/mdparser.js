(function () {
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

  const merge = (...arrList) => {
    return arrList.reduce((arr1, arr2) => {
      return arr1.concat(arr2)
    }, [])
  };

  const last = (arr) => {
    return arr[arr.length - 1]
  };

  const hasOne = (arr, item) => arr.indexOf(item) > -1;

  const flatten = (arr) => arr.reduce((a, b) => a.concat(b), []);

  //-------------------------------------------------------------
  //												parser
  //-------------------------------------------------------------

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

  // const _and = (...ps) => {
  //   return (toks, ctx) => {

  //     const loop = (ps, res) => {
  //       if (isNull(ps)) {
  //         const r1 = car(res)
  //         return [car(r1), car(cdr(r1))]
  //       } else {
  //         const [t, r] = applyCheck(car(ps), toks, ctx)
  //         if (!t) {
  //           return [false, false]
  //         } else {
  //           return loop(cdr(ps), cons([t, r], res))
  //         }
  //       }
  //     }
  //     return loop(ps, [])
  //   }
  // }

  // const _negation = (...ps) => {
  //   const parser = _seqP(...ps)
  //   return (toks, ctx) => {
  //     const [t, r] = parser(toks, ctx)
  //     if (!t && !isNull(toks)) {
  //       return [[car(toks)], cdr(toks)]
  //     } else {
  //       return [false, false]
  //     }
  //   }
  // }

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

  const _typeCtx = (type, expr) => {
    const parser = _type(type, expr);
    return (toks, ctx) => {
      const newCtx = [type, ...ctx];
      const a = parser(toks, newCtx);
      return a
    }
  };

  const _avoidCtx = (avoidCtx, expr) => {
    return (toks, ctx) => {
      if (hasOne(ctx, avoidCtx)) { return [false, false] }
      else { return expr(toks, ctx) }
    }
  };

  // const _effectiveCtx = (effectiveCtx, expr) => {
  //   return (toks, ctx) => {
  //     if (!hasOne(ctx, effectiveCtx)) { return [false, false] }
  //     else { return expr(toks, ctx) }
  //   }
  // }


  //-------------------------------------------------------------
  //												md parser
  //-------------------------------------------------------------

  const $strongOp = _seq($_('*'), $_('*'));
  const $str2Op = _seq($_('_'), $_('_'));
  const $empOp = $_('*');
  const $emp2Op = $_('_');
  const $strikeOp = _seq($_('~'), $_('~'));
  const $underOp = _seq($_('+'), $_('+'));

  const $strong = (toks, ctx) => {
    const expr = _seqP($strongOp, _plus($sexp), $strongOp);
    const type = 'strong';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $str2 = (toks, ctx) => {
    const expr = _seqP($str2Op, _plus($sexp), $str2Op);
    const type = 'str2';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $emphisis = (toks, ctx) => {
    const expr = _seqP($empOp, _plus($sexp), $empOp);
    const type = 'empthsis';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $emp2 = (toks, ctx) => {
    const expr = _seqP($emp2Op, _plus($sexp), $emp2Op);
    const type = 'emp2';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $strike = (toks, ctx) => {
    const expr = _seqP($strikeOp, _plus($sexp), $strikeOp);
    const type = 'strike';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $underline = (toks, ctx) => {
    const expr = _seqP($underOp, _plus($sexp), $underOp);
    const type = 'underline';
    const $typeExpr = _typeCtx(type, expr);
    const parser = _avoidCtx(type, $typeExpr);

    return parser(toks, ctx)
  };

  const $whitespace = $pred((node) => isWhitespace(node));
  // const $tok = $pred((node) => isToken(node))

  const $strikeTok = $$('~');
  const $strCtx = _avoidCtx('strike', $strikeTok);


  const $empTok = $$('*');
  const $empCtx = _avoidCtx('strong', _avoidCtx('empthsis', $empTok));

  const $emp2Tok = $$('_');
  const $emp2Ctx = _avoidCtx('str2', _avoidCtx('emp2', $emp2Tok));

  const $underTok = $$('+');
  const $underlineCtx = _avoidCtx('underline', $underTok);


  const $ttok = _or(
    $pred((node) => isToken(node)),
    $underline,
    $strike,
    $strong,
    $str2,
    $emphisis,
    $emp2,
    $strCtx,
    $empCtx,
    $emp2Ctx,
    $underlineCtx
  );

  const $sexp = _seprate_($ttok, _all($whitespace));
  const $all = _or(
    _seq(_all($whitespace), $sexp, _all($whitespace)),
    _all($whitespace)
  );

  //-------------------------------------------------------------
  //												eval
  //-------------------------------------------------------------

  const mdEval = (tok, ctx) => {
    if (
      tok.type === 'token' ||
      tok.type === 'whitespace' ||
      tok.type === 'op'
    ) {
      tok.ctx = [...ctx];

      return tok
    } else {
      if (tok.type === 'emp2') { tok.type = 'empthsis'; }
      if (tok.type === 'str2') { tok.type = 'strong'; }
      return mdEvalList(tok.elts, [...ctx, tok.type])
    }
  };

  const mdEvalList = (toks, ctx) => {
    const list = toks.map((tok) => {
      return mdEval(tok, ctx)
    });

    return flatten(list)
  };

  const parser = (str) => {
    const toks = scan(str);
    const [t] = $all(toks, []);
    const nodes = mdEvalList(t, []);
    return nodes
  };

  const transToNodes = (toks) => {
    const ctxTransform = (ctx) => {
      const result = {};

      ctx.forEach((c) => {
        switch (c) {
          case 'empthsis':
            result.fontStyle = 'italic';
            return
          case 'strong':
            result.fontWeight = 'bold';
            return
          case 'strike':
            if (result.textDecoration === undefined) {
              result.textDecoration = 'line-through';
            } else {
              result.textDecoration += ' line-through';
            }
            return
          case 'underline':
            if (result.textDecoration === undefined) {
              result.textDecoration = 'underline';
            } else {
              result.textDecoration += ' underline';
            }
            return
        }
      });
      return result
    };

    return toks.map((tok) => {
      const style = ctxTransform(tok.ctx);
      return {
        content: tok.elts,
        style
      }
    })
  };

  var index = (str = '') => {
    const toks = parser(str);
    return transToNodes(toks)
  };

  return index;

}());
