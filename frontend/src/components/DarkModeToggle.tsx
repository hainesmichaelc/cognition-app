import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === 'dark'

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
      <Moon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
    </div>
  )
}
