import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clipQueryText,
  extractMarkdownLinks,
  normalizeWikiPageLink,
  queryTerms,
  rankNavigationLinks,
  sourceRemovalMarkers,
  uniqueNavigationLinks,
} from '../wikiQueryUtils.js'
import {
  inferPageType,
  normalizeSourceIds,
  parseFrontmatter,
  splitFrontmatter,
} from '../WikiMarkdownMetadata.js'

test('page links resolve inside the wiki tree and reject unsafe targets', () => {
  assert.equal(normalizeWikiPageLink('../entities/y.md', 'pages/concepts/x.md'), 'pages/entities/y.md')
  assert.equal(normalizeWikiPageLink('topic', 'pages/concepts/x.md'), 'pages/concepts/topic.md')
  assert.equal(normalizeWikiPageLink('/pages/index.md', 'pages/concepts/x.md'), 'index.md')
  assert.equal(normalizeWikiPageLink('guide#section', 'index.md'), 'guide.md')
  // Two levels up from pages/concepts still lands on the wiki root, not outside it.
  assert.equal(normalizeWikiPageLink('../../secret.md', 'pages/concepts/x.md'), 'secret.md')
  for (const unsafe of ['', '#anchor', 'https://example.com/a.md', 'mailto:a@example.com', '../../../secret.md', 'image.png']) {
    assert.equal(normalizeWikiPageLink(unsafe, 'pages/concepts/x.md'), '', unsafe)
  }
  assert.equal(normalizeWikiPageLink('../secret.md', 'index.md'), '')
})

test('markdown extraction keeps internal page links and ignores images and external URLs', () => {
  const content = [
    '![diagram](https://example.com/diagram.png)',
    '[外部](https://example.com/page)',
    '[概念](../entities/y.md)',
    '[[其他|别名]]',
  ].join('\n')
  const links = extractMarkdownLinks(content, 'pages/concepts/x.md')

  assert.deepEqual(links.map(link => [link.title, link.path]), [
    ['概念', 'pages/entities/y.md'],
    ['别名', 'pages/concepts/其他.md'],
  ])
  assert.equal(links[0].source_page, 'pages/concepts/x.md')
  assert.equal(links[1].href, '其他')
  assert.equal(links[1].context, '[[其他|别名]]')
})

test('navigation links deduplicate per wiki and path, then rank title matches first', () => {
  const links = [
    { wiki_id: 'w1', path: 'a.md', title: '普通页面' },
    { wiki_id: 'w1', path: 'a.md', title: '重复页面' },
    { wiki_id: 'w1', path: 'b.md', title: '配方法', context: '' },
    { wiki_id: 'w2', path: 'a.md', title: '另一个 Wiki' },
  ]
  const unique = uniqueNavigationLinks(links)
  assert.equal(unique.length, 3)
  assert.equal(unique[0].title, '普通页面')

  const ranked = rankNavigationLinks(unique, '配方法')
  assert.equal(ranked[0].path, 'b.md')
  assert.ok(ranked[0].score > ranked[1].score)
})

test('query terms include CJK bigrams for partial Chinese matches', () => {
  const terms = queryTerms('配方法')
  for (const term of ['配方法', '配方', '方法']) assert.ok(terms.includes(term), term)
  assert.deepEqual(queryTerms('   '), [])
})

test('query clips keep the limit and mark truncation', () => {
  const text = 'x'.repeat(40)
  const clipped = clipQueryText(text, 20)
  assert.equal(clipped.length, 20)
  assert.ok(clipped.endsWith('...[truncated]'))
  assert.equal(clipQueryText(' short ', 20), 'short')
  assert.equal(clipQueryText(text, 0), '')
})

test('frontmatter parsing preserves page metadata and list values', () => {
  const parsed = parseFrontmatter('---\ntype: concept\ntitle: 测试\nsource_ids:\n  - src_1\n  - src_2\n---\n\n# 正文')
  assert.equal(parsed.hasFrontmatter, true)
  assert.deepEqual(parsed.attributes, { type: 'concept', title: '测试', source_ids: ['src_1', 'src_2'] })
  assert.equal(parsed.body, '# 正文')

  const broken = splitFrontmatter('---\nbroken')
  assert.equal(broken.hasFrontmatter, false)
  assert.equal(broken.invalid, true)
  assert.equal(broken.body, '---\nbroken')
})

test('page types and source ids are normalized for storage', () => {
  assert.equal(inferPageType('index.md'), 'index')
  assert.equal(inferPageType('pages\\entities\\model.md'), 'entity')
  assert.equal(inferPageType('pages/questions/q.md'), 'question')
  assert.equal(inferPageType('other.md'), 'concept')
  assert.deepEqual(normalizeSourceIds([' src_1 ', '', 'src_1', 'src_2']), ['src_1', 'src_2'])
})

test('source removal markers are stable, lowercase and skip short values', () => {
  const markers = sourceRemovalMarkers({
    id: 'src_123456',
    original_uri: 'https://Example.com/a.docx',
    original_path: 'C:\\Docs\\A.docx',
  })
  assert.equal(new Set(markers).size, markers.length)
  assert.ok(markers.includes('src_123456'))
  assert.ok(markers.includes('https://example.com/a.docx'))
  assert.ok(markers.includes('c:/docs/a.docx'))
  assert.ok(markers.every(marker => marker === marker.toLowerCase()))
  assert.deepEqual(sourceRemovalMarkers({}), [])
})
