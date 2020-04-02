const HTMLIZE_MAP = {
  'emphasis': (str) => `<i>${str}</i>`,
  'underline': (str) => `<u>${str}</u>`,
  'strong': (str) => `<strong>${str}</strong>`,
  'strike': (str) => `<strike>${str}</strike>`,
  'line': (str) => `<p>${str}</p>`,
  'h1': (str) => `<h1>${str}</h1>`,
}

const htmlize = (node) => {
  let inner
  if (Array.isArray(node.elts)) {
    inner = node.elts.map(htmlize).reduce((a, b) => a + b, '')
  } else {
    inner = node.elts
  }

  const fn = HTMLIZE_MAP[node.type]
  if (!fn) { return inner }
  else { return fn(inner) }
}

export default htmlize
