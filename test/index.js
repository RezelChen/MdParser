const parser = require('../dist/mdparser.cjs')

// const mdMap = {
//   '_fd_': 'fd[empthsis]',
//   '': '',
//   ' ': ' ',
//   ' 1': ' ,1',
//   '1 ': '1, ',
//   '  1 3 1': ' , ,1, ,3, ,1',
//   ' 1 3 1 ': ' ,1, ,3, ,1, ',
//   '*': '*',
//   '1*': '1,*',
//   '1*2': '1,*,2',
//   '*1*': `1[empthsis]`,
//   '* *': '*, ,*',
//   '* 1*': '*, ,1,*',
//   '*1 *': '*,1, ,*',
//   '1**3': '1,*,*,3',
//   '* 1**': '*, ,1,*,*',
//   '* 1*3*': `*, ,1,3[empthsis]`,
//   '**1 2 **': '*,*,1, ,2, ,*,*',
//   '*1 2*': `1[empthsis], [empthsis],2[empthsis]`,
//   '1*2*': `1,2[empthsis]`,
//   '**dd**': `dd[strong]`,
//   '*fd**sss***dd**': `fd[empthsis],sss[empthsis:strong],dd,*,*`,
//   '1* 2*3': '1,*, ,2,*,3',
//   '~~ee~~': 'ee[strike]',
//   '1~~ee~~': '1,ee[strike]',
//   '~~ ee~~': '~,~, ,ee,~,~',
//   '~~ee ~~': '~,~,ee, ,~,~',
//   // '<u>fd</u>': 'fd[underline]',
//   // '<u></u>': '<u>,</u>',
//   // '<u>**fd**</u>': 'fd[underline:strong]',
//   // '<u></u>**fd**</u>': '<u>,</u>,fd[strong],</u>',
//   // '<u><u>**fd**</u>': '<u>,fd[underline:strong]',
//   '++fd++': 'fd[underline]',
//   '***ss***': 'ss[strong:empthsis]',
//   '*fd**sss**d*d': 'fd[empthsis],sss[empthsis:strong],d[empthsis],d',
//   '***sss**d*': 'sss[empthsis:strong],d[empthsis]',
//   '*d**sss***': 'd[empthsis],sss[empthsis:strong]',
//   '**d*sss***': 'd[strong],sss[strong:empthsis]',
//   '*fd**sss**d*d': 'fd[empthsis],sss[empthsis:strong],d[empthsis],d',
//   '1****': '1,*,*,*,*',
//   '1**2**': '1,2[strong]',
//   '~~~~': '~,~,~,~',
//   '~~t *a* e~~': 't[strike], [strike],a[strike:empthsis], [strike],e[strike]',
// }

const TEST_CASES = [
  ' ',
  '*abc*',
  '*ab**cd***fg**',
  '_ab_',
  '[*ab*]',
  '(*ab*)',
  '[Hello World](http://www.example.com)',
  '[[Hello]World](http://www.example.com)',
  '[[Hello](World)](http://www.example.com)',
  '![Hello World](http://www.example.com)',
  '# hello',
  '- hello',
  '1. hello',
  '> hello',
  '`npm install`',
  `\`\`\`
hello
\`\`\``,
]

TEST_CASES.forEach((str) => {
  const res = parser(str)
  console.log(res)
})
