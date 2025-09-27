import { Alert, AlertDescription } from "./ui/alert"
import { AlertTriangle } from "lucide-react"

interface SearchFilterWarningProps {
  show: boolean
}

export function SearchFilterWarning({ show }: SearchFilterWarningProps) {
  if (!show) return null

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        Search/filter results limited to loaded issues. Not all repository issues have been fetched.
      </AlertDescription>
    </Alert>
  )
}
