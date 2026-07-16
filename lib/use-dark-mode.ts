import useDarkModeImpl from '@fisch0920/use-dark-mode'
import * as React from 'react'

export function useDarkMode() {
  const darkMode = useDarkModeImpl(false, { classNameDark: 'dark-mode' })
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  return {
    isDarkMode: hasMounted ? darkMode.value : false,
    toggleDarkMode: darkMode.toggle
  }
}
