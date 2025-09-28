interface StructuredOutputData {
  progress_pct: number
  confidence: 'low' | 'medium' | 'high'
  summary: string
  risks: string[]
  dependencies: string[]
  action_plan: Array<{
    step: number
    desc: string
    done: boolean
  }>
  branch_suggestion: string
  pr_url?: string
  status?: string
  response?: {
    status: string
    summary: string
    confidence: 'low' | 'medium' | 'high'
    progress_pct: number
    risks: string[]
    dependencies: string[]
    action_plan: Array<{
      step: number
      desc: string
      done: boolean
    }>
    branch_suggestion: string
    pr_url?: string
  }
}

interface StructuredOutput {
  progress_pct?: number
  confidence?: 'low' | 'medium' | 'high'
  summary?: string
  risks?: string[]
  dependencies?: string[]
  action_plan?: Array<{
    step: number
    desc: string
    done: boolean
  }>
  branch_suggestion?: string
  pr_url?: string
  status?: string
  response?: {
    status: string
    summary: string
    confidence: 'low' | 'medium' | 'high'
    progress_pct: number
    risks: string[]
    dependencies: string[]
    action_plan: Array<{
      step: number
      desc: string
      done: boolean
    }>
    branch_suggestion: string
    pr_url?: string
  }
  progress?: StructuredOutputData
}

/**
 * Normalizes structured output to handle both flat and nested formats
 * @param structuredOutput - The structured output from the API
 * @returns Normalized structured output data
 */
export function normalizeStructuredOutput(structuredOutput: StructuredOutput | null | undefined): StructuredOutputData | null {
  if (!structuredOutput) return null
  
  if (structuredOutput.progress) {
    return structuredOutput.progress
  }
  
  return {
    progress_pct: structuredOutput.progress_pct || 0,
    confidence: structuredOutput.confidence || 'low',
    summary: structuredOutput.summary || '',
    risks: structuredOutput.risks || [],
    dependencies: structuredOutput.dependencies || [],
    action_plan: structuredOutput.action_plan || [],
    branch_suggestion: structuredOutput.branch_suggestion || '',
    pr_url: structuredOutput.pr_url,
    status: structuredOutput.status,
    response: structuredOutput.response
  }
}
