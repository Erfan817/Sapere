#!/usr/bin/env node
/**
 * kg.mjs — 本地知识图谱查询 CLI（零依赖）
 *
 * 读取用户自备的 cn-math-taxonomy 数据（topics.json / dependencies.json / questions.json），
 * 提供知识点检索、先修闭包、学习路径、前置诊断与练习取题。
 *
 * 数据不随 Sapere 分发；许可与来源见 references/cn-math-taxonomy.md。
 *
 * 用法：node kg.mjs <command> [参数] [--data-dir <目录>]
 */

import fs from 'node:fs'
import path from 'node:path'

const SOURCE = {
  name: 'cn-math-taxonomy',
  url: 'https://github.com/xiaoyang111222/cn-math-taxonomy',
  license: 'CC BY-NC 4.0',
}

const SUBJECTS = {
  cnb: '生物',
  cnc: '语文',
  cnd: '道德与法治',
  cne: '英语',
  cng: '地理',
  cnh: '历史',
  cnk: '化学',
  cnm: '数学',
  cnp: '物理',
  cns: '科学',
}

const DATA_CANDIDATES = [
  'context/knowledge-graph',
  'context/cn-math-taxonomy/data',
  'docs/knowledge-graph',
  'knowledge-graph',
  'cn-math-taxonomy/data',
]

const SETUP_HINT = {
  why: '知识图谱数据采用 CC BY-NC 4.0，不随 Sapere 分发，需要你自备一份。',
  steps: [
    '获取数据：git clone --depth 1 https://github.com/xiaoyang111222/cn-math-taxonomy',
    '把仓库里的 data 目录复制到工作区的 context/knowledge-graph/（即 context/knowledge-graph/topics.json 存在）',
    '或把任意位置的 data 目录路径作为 --data-dir 传入；也可以设置环境变量 KG_DATA_DIR',
  ],
  license: 'CC BY-NC 4.0：仅限非商业使用，使用时需署名来源，不得移除版权声明。',
}

function fail(message, extra = {}) {
  const payload = { ok: false, error: message, ...extra }
  process.stdout.write(JSON.stringify(payload))
  process.exit(extra.exitCode || 1)
}

function parseArgv(argv) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next
      i += 1
    } else {
      flags[key] = true
    }
  }
  return { flags, positional }
}

function numberFlag(flags, key, fallback) {
  const raw = flags[key]
  if (raw === undefined || raw === true) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function resolveDataRoot(dir) {
  if (!dir) return null
  const candidate = path.resolve(String(dir))
  if (fs.existsSync(path.join(candidate, 'topics.json'))) return candidate
  if (fs.existsSync(path.join(candidate, 'data', 'topics.json'))) return path.join(candidate, 'data')
  return null
}

function locateDataDir(explicit) {
  const tried = []
  if (explicit) {
    tried.push(String(explicit))
    const found = resolveDataRoot(explicit)
    if (found) return { dir: found, tried }
  }
  const fromEnv = process.env.KG_DATA_DIR
  if (fromEnv) {
    tried.push(`$KG_DATA_DIR=${fromEnv}`)
    const found = resolveDataRoot(fromEnv)
    if (found) return { dir: found, tried }
  }
  const cwd = process.cwd()
  const cwdItself = resolveDataRoot(cwd)
  if (cwdItself) return { dir: cwdItself, tried }
  for (const rel of DATA_CANDIDATES) {
    tried.push(rel)
    const found = resolveDataRoot(path.join(cwd, rel))
    if (found) return { dir: found, tried }
  }
  return { dir: null, tried }
}

function readJson(filePath, required = true) {
  if (!fs.existsSync(filePath)) {
    if (!required) return null
    fail(`缺少数据文件：${path.basename(filePath)}`, { hint: SETUP_HINT })
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`数据文件无法解析：${path.basename(filePath)}`, { detail: String(error.message || error) })
  }
}

function createGraph(dir) {
  const topics = readJson(path.join(dir, 'topics.json'))
  const dependencies = readJson(path.join(dir, 'dependencies.json'))
  if (!Array.isArray(topics) || !Array.isArray(dependencies)) {
    fail('数据格式不符合预期：topics.json 与 dependencies.json 应为数组', { hint: SETUP_HINT })
  }

  const byId = new Map()
  for (const topic of topics) {
    if (topic && typeof topic.id === 'string') byId.set(topic.id, topic)
  }

  const prereqsOf = new Map()
  const successorsOf = new Map()
  let hardEdges = 0
  let softEdges = 0
  for (const edge of dependencies) {
    const topicId = edge?.topicId
    const prerequisiteId = edge?.prerequisiteId
    if (!topicId || !prerequisiteId || !byId.has(topicId) || !byId.has(prerequisiteId)) continue
    const record = { id: prerequisiteId, strength: edge.strength === 'soft' ? 'soft' : 'hard', reason: edge.reason || '' }
    if (!prereqsOf.has(topicId)) prereqsOf.set(topicId, [])
    prereqsOf.get(topicId).push(record)
    if (!successorsOf.has(prerequisiteId)) successorsOf.set(prerequisiteId, [])
    successorsOf.get(prerequisiteId).push({ id: topicId, strength: record.strength, reason: record.reason })
    if (record.strength === 'hard') hardEdges += 1
    else softEdges += 1
  }

  return {
    dir,
    topics,
    byId,
    prereqsOf,
    successorsOf,
    edges: { hard: hardEdges, soft: softEdges, total: hardEdges + softEdges },
    _questions: undefined,
    questions() {
      if (this._questions !== undefined) return this._questions
      const data = readJson(path.join(dir, 'questions.json'), false)
      this._questions = Array.isArray(data) ? data : []
      return this._questions
    },
  }
}

function subjectCode(id) {
  return String(id || '').split('_')[0]
}

function subjectName(id) {
  return SUBJECTS[subjectCode(id)] || '未分类'
}

function gradeLabel(grade, id) {
  const value = Number(grade)
  if (!Number.isFinite(value)) return ''
  const subject = subjectName(id)
  if (value >= 1 && value <= 6) return `${value}年级（小学）`
  if (value >= 7 && value <= 9) return `${value}年级（初中）`
  if (subject === '英语') {
    if (value >= 10 && value <= 12) return `高中必修${value - 9}`
    if (value >= 13 && value <= 16) return `高中选择性必修${value - 12}`
  }
  if (subject === '数学') {
    if (value === 10) return '高一（必修第一册）'
    if (value === 11) return '高一（必修第二册）'
    if (value >= 12 && value <= 14) return `选择性必修${value - 11}`
  }
  if (value >= 10 && value <= 12) return `${value}年级（高中）`
  return `阶段 ${value}`
}

function topicBrief(topic) {
  if (!topic) return null
  return {
    id: topic.id,
    name: topic.name,
    subject: subjectName(topic.id),
    grade: topic.grade,
    grade_label: gradeLabel(topic.grade, topic.id),
    domain: topic.domain,
    chapter: topic.chapter,
    type: topic.type,
  }
}

function requireTopic(graph, id) {
  const topic = graph.byId.get(id)
  if (!topic) fail(`找不到知识点：${id}`, { hint: '先用 search 命令按名称检索，拿到准确的 id。' })
  return topic
}

function directPrereqs(graph, id, hardOnly = false) {
  const list = graph.prereqsOf.get(id) || []
  return hardOnly ? list.filter(item => item.strength === 'hard') : list
}

function closure(graph, id, { depth = 3, hardOnly = false } = {}) {
  const seen = new Map()
  let frontier = [{ id, level: 0 }]
  const visited = new Set([id])
  while (frontier.length) {
    const next = []
    for (const node of frontier) {
      if (node.level >= depth) continue
      for (const edge of directPrereqs(graph, node.id, hardOnly)) {
        if (visited.has(edge.id)) continue
        visited.add(edge.id)
        const level = node.level + 1
        seen.set(edge.id, { id: edge.id, level, via: node.id, strength: edge.strength, reason: edge.reason })
        next.push({ id: edge.id, level })
      }
    }
    frontier = next
  }
  return [...seen.values()]
}

function orderByGrade(graph, ids) {
  return ids.slice().sort((a, b) => {
    const ta = graph.byId.get(a)
    const tb = graph.byId.get(b)
    const ga = Number(ta?.grade ?? 99)
    const gb = Number(tb?.grade ?? 99)
    if (ga !== gb) return ga - gb
    return String(a).localeCompare(String(b), 'en')
  })
}

// 在闭包子图上做拓扑排序（先修在前），同层按年级与 id 稳定排序。
function topoOrder(graph, targetId, ids) {
  const set = new Set(ids)
  set.add(targetId)
  const indegree = new Map()
  for (const id of set) indegree.set(id, 0)
  for (const id of set) {
    for (const edge of directPrereqs(graph, id)) {
      if (set.has(edge.id)) indegree.set(id, (indegree.get(id) || 0) + 1)
    }
  }
  const rank = (id) => {
    const topic = graph.byId.get(id)
    const grade = Number(topic?.grade ?? 99)
    return `${String(grade).padStart(2, '0')}|${id}`
  }
  const ready = [...set].filter(id => (indegree.get(id) || 0) === 0).sort((a, b) => rank(a).localeCompare(rank(b)))
  const ordered = []
  while (ready.length) {
    const id = ready.shift()
    ordered.push(id)
    for (const edge of graph.successorsOf.get(id) || []) {
      if (!set.has(edge.id)) continue
      indegree.set(edge.id, (indegree.get(edge.id) || 0) - 1)
      if (indegree.get(edge.id) === 0) {
        ready.push(edge.id)
        ready.sort((a, b) => rank(a).localeCompare(rank(b)))
      }
    }
  }
  for (const id of set) {
    if (!ordered.includes(id)) ordered.push(id)
  }
  return ordered
}

function scoreTopic(topic, query) {
  const q = query.toLowerCase()
  const name = String(topic.name || '').toLowerCase()
  const chapter = String(topic.chapter || '').toLowerCase()
  const domain = String(topic.domain || '').toLowerCase()
  const description = String(topic.description || '').toLowerCase()
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.includes(q)) return 60
  if (chapter.includes(q)) return 35
  if (domain.includes(q)) return 25
  if (description.includes(q)) return 15
  return 0
}

function paginate(items, offset, limit) {
  const start = Math.max(0, offset || 0)
  return items.slice(start, start + limit)
}

function commandStatus(graph) {
  const bySubject = {}
  for (const topic of graph.topics) {
    const name = subjectName(topic.id)
    bySubject[name] = (bySubject[name] || 0) + 1
  }
  const grades = graph.topics
    .map(topic => Number(topic.grade))
    .filter(value => Number.isFinite(value))
  const withDiagnostic = graph.topics.filter(topic => topic?.diagnostic_question?.question).length
  const questions = graph.questions()
  return {
    ok: true,
    data_dir: graph.dir,
    source: SOURCE,
    counts: {
      topics: graph.topics.length,
      edges: graph.edges,
      questions: questions.length,
      topics_with_diagnostic: withDiagnostic,
    },
    subjects: bySubject,
    grade_range: grades.length ? [Math.min(...grades), Math.max(...grades)] : [],
    files: {
      topics: `${graph.topics.length} 条`,
      dependencies: `${graph.edges.total} 条（hard ${graph.edges.hard} / soft ${graph.edges.soft}）`,
      questions: questions.length ? `${questions.length} 道` : '未提供',
    },
    notice: '数据来源：cn-math-taxonomy（CC BY-NC 4.0）。引用结论时请注明来源与许可，仅限非商业使用。',
  }
}

function commandSearch(graph, flags, positional) {
  const query = positional.join(' ').trim()
  if (!query) fail('search 需要一个检索词，例如：search 配方法')
  const subject = flags.subject ? String(flags.subject) : ''
  const grade = numberFlag(flags, 'grade', null)
  const limit = numberFlag(flags, 'limit', 20)
  const offset = numberFlag(flags, 'offset', 0)

  const matches = []
  for (const topic of graph.topics) {
    if (subject && !subjectName(topic.id).includes(subject)) continue
    if (grade !== null && Number(topic.grade) !== grade) continue
    const score = scoreTopic(topic, query)
    if (score <= 0) continue
    matches.push({ topic, score })
  }
  matches.sort((a, b) => b.score - a.score || Number(a.topic.grade ?? 99) - Number(b.topic.grade ?? 99))
  const page = paginate(matches, offset, limit)

  return {
    ok: true,
    query,
    total: matches.length,
    returned: page.length,
    offset,
    results: page.map(item => ({ ...topicBrief(item.topic), score: item.score })),
    next: matches.length > offset + page.length ? `还有 ${matches.length - offset - page.length} 条，可用 --offset ${offset + page.length} 继续` : undefined,
  }
}

function commandTopic(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('topic 需要一个知识点 id，例如：topic cnm_221')
  const topic = requireTopic(graph, id)
  const prereqs = directPrereqs(graph, id).map(edge => ({
    ...topicBrief(graph.byId.get(edge.id)),
    strength: edge.strength,
    reason: edge.reason,
  }))
  const successors = (graph.successorsOf.get(id) || []).map(edge => ({
    ...topicBrief(graph.byId.get(edge.id)),
    strength: edge.strength,
  }))
  return {
    ok: true,
    topic: {
      ...topicBrief(topic),
      description: topic.description,
      mastery_criteria: topic.mastery_criteria || [],
      diagnostic_question: topic.diagnostic_question || null,
      standards: topic.standards || [],
      external: !!topic.external,
    },
    prerequisites: prereqs,
    unlocks: successors,
  }
}

function commandPrereqs(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('prereqs 需要一个知识点 id')
  const topic = requireTopic(graph, id)
  const depth = numberFlag(flags, 'depth', 2)
  const hardOnly = flags['hard-only'] === true
  const limit = numberFlag(flags, 'limit', 60)
  const nodes = closure(graph, id, { depth, hardOnly })
  const ordered = orderByGrade(graph, nodes.map(node => node.id))
  const detail = ordered.slice(0, limit).map(nodeId => {
    const meta = nodes.find(node => node.id === nodeId)
    return { ...topicBrief(graph.byId.get(nodeId)), level: meta.level, strength: meta.strength }
  })
  return {
    ok: true,
    topic: topicBrief(topic),
    depth,
    hard_only: hardOnly,
    total: nodes.length,
    returned: detail.length,
    prerequisites: detail,
  }
}

function commandPath(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('path 需要一个目标知识点 id，例如：path cnm_221')
  const topic = requireTopic(graph, id)
  const depth = numberFlag(flags, 'depth', 3)
  const hardOnly = flags['hard-only'] === true
  const limit = numberFlag(flags, 'limit', 30)
  const nodes = closure(graph, id, { depth, hardOnly })
  const ids = nodes.map(node => node.id)
  const ordered = topoOrder(graph, id, ids)
  const levelOf = new Map(nodes.map(node => [node.id, node.level]))
  const shown = ordered.slice(0, limit)
  const steps = shown.map((nodeId, index) => ({
    step: index + 1,
    ...topicBrief(graph.byId.get(nodeId)),
    level: levelOf.get(nodeId) ?? 1,
  }))
  return {
    ok: true,
    target: topicBrief(topic),
    hard_only: hardOnly,
    depth_limit: depth,
    prerequisite_count: ids.length,
    returned: steps.length,
    truncated: ordered.length > steps.length || (ids.length > 0 && depth < 99 && nodes.some(node => node.level === depth)),
    path: steps,
  }
}

function commandDiagnose(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('diagnose 需要一个目标知识点 id，例如：diagnose cnm_221')
  const topic = requireTopic(graph, id)
  const depth = numberFlag(flags, 'depth', 3)
  const hardOnly = flags['hard-only'] === true
  const limit = numberFlag(flags, 'limit', 8)
  const nodes = closure(graph, id, { depth, hardOnly })
  // 自适应诊断：先问目标本身，答错再问它直接依赖的概念，逐层向下。
  // 同一层内先问年级更高的（离目标更近），避免一上来就跳到小学二三年级。
  const ordered = nodes.slice().sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level
    const ga = Number(graph.byId.get(a.id)?.grade ?? 99)
    const gb = Number(graph.byId.get(b.id)?.grade ?? 99)
    if (ga !== gb) return gb - ga
    return String(a.id).localeCompare(String(b.id), 'en')
  })
  const list = [{ id, level: 0, strength: null }, ...ordered].slice(0, limit)
  const items = list.map(item => {
    const node = graph.byId.get(item.id)
    const diagnostic = node?.diagnostic_question || null
    return {
      ...topicBrief(node),
      level: item.level,
      strength: item.strength,
      question: diagnostic?.question || null,
      answer: diagnostic?.answer || null,
      mastery_criteria: node?.mastery_criteria || [],
    }
  })
  return {
    ok: true,
    target: topicBrief(topic),
    depth,
    hard_only: hardOnly,
    total_prerequisites: nodes.length,
    truncated: nodes.length + 1 > list.length,
    ask_order: '第 1 题问目标本身；答错再按 level 逐层问它的先修，同层从高年级到低年级。答对可跳过该节点以下的基础追问。',
    items,
  }
}

function commandNext(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('next 需要一个知识点 id')
  const topic = requireTopic(graph, id)
  const limit = numberFlag(flags, 'limit', 30)
  const successors = (graph.successorsOf.get(id) || [])
    .map(edge => ({ ...topicBrief(graph.byId.get(edge.id)), strength: edge.strength }))
    .sort((a, b) => Number(a.grade ?? 99) - Number(b.grade ?? 99))
  return {
    ok: true,
    topic: topicBrief(topic),
    total: successors.length,
    unlocks: successors.slice(0, limit),
  }
}

function commandQuestions(graph, flags, positional) {
  const id = positional[0]
  if (!id) fail('questions 需要一个知识点 id')
  const topic = requireTopic(graph, id)
  const limit = numberFlag(flags, 'limit', 5)
  const offset = numberFlag(flags, 'offset', 0)
  const difficulty = flags.difficulty === true ? '' : String(flags.difficulty || '')
  const withPrereqs = flags['with-prereqs'] === true

  const topicIds = new Set([id])
  if (withPrereqs) {
    for (const edge of directPrereqs(graph, id)) topicIds.add(edge.id)
  }
  const all = graph.questions().filter(item => {
    if (!item || !topicIds.has(item.topicId)) return false
    if (difficulty && String(item.difficulty || '') !== difficulty) return false
    return true
  })
  const page = paginate(all, offset, limit)
  return {
    ok: true,
    topic: topicBrief(topic),
    with_prereqs: withPrereqs,
    difficulty: difficulty || '全部',
    total: all.length,
    returned: page.length,
    questions: page.map(item => ({
      id: item.id,
      topicId: item.topicId,
      topic_name: graph.byId.get(item.topicId)?.name || '',
      difficulty: item.difficulty,
      type: item.type,
      prompt: item.prompt,
      answer: item.answer,
      explanation: item.explanation || '',
    })),
  }
}

const COMMANDS = {
  status: commandStatus,
  search: commandSearch,
  topic: commandTopic,
  prereqs: commandPrereqs,
  path: commandPath,
  diagnose: commandDiagnose,
  next: commandNext,
  questions: commandQuestions,
}

function main() {
  const argv = process.argv.slice(2)
  const { flags, positional } = parseArgv(argv)
  const commandName = positional.shift()

  if (!commandName || commandName === 'help' || flags.help) {
    return {
      ok: true,
      usage: 'node kg.mjs <status|search|topic|prereqs|path|diagnose|next|questions> [参数] [--data-dir 目录]',
      commands: {
        status: '数据是否就位、学科与规模概览',
        search: 'search <关键词> [--subject 数学] [--grade 8] [--limit 20]',
        topic: 'topic <id>：知识点详情、直接先修与后续解锁',
        prereqs: 'prereqs <id> [--depth 2] [--hard-only]：先修闭包',
        path: 'path <id> [--depth 3] [--limit 30] [--hard-only]：到目标的学习路径（拓扑序，先修在前）',
        diagnose: 'diagnose <id> [--depth 4] [--limit 10]：前置诊断题序列',
        next: 'next <id>：这个知识点解锁了什么',
        questions: 'questions <id> [--limit 5] [--difficulty basic] [--with-prereqs]',
      },
      setup: SETUP_HINT,
    }
  }

  const handler = COMMANDS[commandName]
  if (!handler) fail(`未知命令：${commandName}`, { hint: '运行 help 查看可用命令。' })

  const located = locateDataDir(flags['data-dir'] === true ? '' : flags['data-dir'])
  if (!located.dir) {
    fail('没有找到知识图谱数据', {
      exitCode: 2,
      searched: located.tried,
      hint: SETUP_HINT,
    })
  }

  const graph = createGraph(located.dir)
  return handler(graph, flags, positional)
}

try {
  const payload = main()
  if (payload) process.stdout.write(JSON.stringify(payload))
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error?.message || error) }))
  process.exit(1)
}
