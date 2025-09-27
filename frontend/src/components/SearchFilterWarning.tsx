import { Alert, AlertDescription } from "./ui/alert"
import { AlertTriangle } from "lucide-react"

interface SearchFilterWarningProps {
  show: boolean
}

export function SearchFilterWarning({ show }: SearchFilterWarningProps) {
  if (!show) return null

  return (
    <Alert className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        Search/filter results limited to loaded issues. Not all repository issues have been fetched.
      </AlertDescription>
    </Alert>
  )
}
