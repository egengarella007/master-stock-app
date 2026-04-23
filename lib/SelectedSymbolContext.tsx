"use client"
import { createContext, useContext, useState, ReactNode } from "react"

type SelectedSymbolContextType = {
  selectedSymbol: string | null
  setSelectedSymbol: (symbol: string) => void
}

const SelectedSymbolContext = createContext<SelectedSymbolContextType>({
  selectedSymbol: null,
  setSelectedSymbol: () => {},
})

export function SelectedSymbolProvider({ children }: { children: ReactNode }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  return (
    <SelectedSymbolContext.Provider value={{ selectedSymbol, setSelectedSymbol }}>
      {children}
    </SelectedSymbolContext.Provider>
  )
}

export function useSelectedSymbol() {
  return useContext(SelectedSymbolContext)
}
