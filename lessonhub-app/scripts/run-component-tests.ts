import { execSync, spawnSync } from 'node:child_process'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const useStaged = !args.has('--all') && !args.has('--unstaged')

const getChangedFiles = (): string[] => {
  try {
    const cmd = useStaged
      ? 'git diff --name-only --cached'
      : 'git diff --name-only'
    const output = execSync(cmd, { encoding: 'utf8' }).trim()
    return output ? output.split('\n') : []
  } catch {
    return []
  }
}

const componentNames = [
  'LessonForm',
  'MultiChoiceCreator',
  'FlashcardCreator',
  'LearningSessionCreator',
  'ComposerLessonCreator',
  'LyricLessonEditor',
  'ArkaningLessonCreator',
  'LessonResponseForm',
  'FlashcardPlayer',
  'MultiChoicePlayer',
  'ComposerLessonPlayer',
  'LyricLessonPlayer',
  'LearningSessionPlayer',
  'ArkaningLessonPlayer',
]

const watchedFiles = new Set(
  componentNames.map(name => `src/app/components/${name}.tsx`)
)
watchedFiles.add('src/lib/multiChoiceAnswers.ts')

const resolveTestFor = (file: string) => {
  if (file === 'src/lib/multiChoiceAnswers.ts') {
    return 'src/lib/multiChoiceAnswers.test.ts'
  }
  if (!file.startsWith('src/app/components/')) return null
  const base = path.basename(file, '.tsx')
  return `src/app/components/${base}.test.tsx`
}

const changedFiles = args.has('--all')
  ? Array.from(watchedFiles)
  : getChangedFiles()

const testTargets = new Set<string>()
changedFiles.forEach(file => {
  if (watchedFiles.has(file)) {
    const testFile = resolveTestFor(file)
    if (testFile) testTargets.add(testFile)
  }
  if (file.endsWith('.test.tsx') || file.endsWith('.test.ts')) {
    testTargets.add(file)
  }
})

if (testTargets.size === 0) {
  process.exit(0)
}

const vitestBin = path.resolve('node_modules/.bin/vitest')
const result = spawnSync(
  vitestBin,
  ['run', ...Array.from(testTargets)],
  { stdio: 'inherit' }
)

process.exit(result.status ?? 1)
