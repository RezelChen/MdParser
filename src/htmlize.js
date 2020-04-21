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
}

const htmlizeList = (elts) => {
  if (Array.isArray(elts)) { return elts.map(htmlize).reduce((a, b) => a + b, '') }
  else { return elts }
}

const getSplitAlign = (node) => {
  switch (node.type) {
    case 'split-center': return 'center'
    case 'split-left': return 'left'
    case 'split-right': return 'right'
    default: return null
  }
}

const htmlizeWihtAlign = (node, align) => {
  const attrs = align ? `align=${align}` : ''
  // almost the same as default in htmlize
  const inner = htmlizeList(node.elts)
  const fn = HTMLIZE_MAP[node.type]
  if (!fn) { return inner }
  else { return fn(inner, attrs) }
}

const htmlizeTr = (tr, aligns) => {
  const inner = tr.elts
    .map((node, i) => htmlizeWihtAlign(node, aligns[i]))
    .reduce((a, b) => a + b, '')
  return `<tr>${inner}</tr>`
}

const htmlize = (node) => {

  switch (node.type) {
    case 'img': {
      const [title, url] = node.elts
      const titleInner = htmlizeList(title.elts)
      const urlInner = htmlizeList(url.elts)
      return `<image src="${urlInner}" title="${titleInner}" style="width: 50%" />`
    }
    case 'link': {
      const [title, url] = node.elts
      const titleInner = htmlizeList(title.elts)
      const urlInner = htmlizeList(url.elts)
      return `<a href="${urlInner}">${titleInner}</a>`
    }
    case 'table': {
      const [tr, sr, ...trs] = node.elts
      const aligns = sr.elts.map(getSplitAlign)
      const thRow = htmlizeTr(tr, aligns)
      const tdRows = trs.map((tr) => htmlizeTr(tr, aligns))
      const inner = [thRow, ...tdRows].reduce((a, b) => a + b, '')
      return `<table>${inner}</table>`
    }
    default: {
      const inner = htmlizeList(node.elts)
      const fn = HTMLIZE_MAP[node.type]
      if (!fn) { return inner }
      else { return fn(inner) }
    }
  }
}

export default htmlize
