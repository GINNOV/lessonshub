import { marked, type MarkedOptions } from 'marked'

const markdownDefaults: MarkedOptions<string, string> = {
  gfm: true,
  breaks: true,
}

function mergeMarkdownOptions(options?: MarkedOptions<string, string>) {
  return options ? { ...markdownDefaults, ...options } : markdownDefaults
}

export function renderMarkdown(markdown: string, options?: MarkedOptions<string, string>) {
  return marked.parse(markdown, mergeMarkdownOptions(options)) as string
}

export function renderInlineMarkdown(markdown: string, options?: MarkedOptions<string, string>) {
  return marked.parseInline(markdown, mergeMarkdownOptions(options)) as string
}
