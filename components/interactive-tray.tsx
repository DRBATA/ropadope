"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

export interface TrayAction {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
  className?: string
}

export interface InteractiveTrayProps {
  isVisible: boolean
  actions: TrayAction[]
  title?: string
}

export function InteractiveTray({ isVisible, actions, title }: InteractiveTrayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 30 }}
          className="fixed bottom-[4.5rem] left-0 right-0 z-40 max-w-md mx-auto px-4"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-4 space-y-3">
            {title && (
              <h3 className="text-sm font-medium text-center border-b border-border/50 pb-2 text-foreground">
                {title}
              </h3>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.onClick}
                  className={cn(
                    "text-xs h-auto py-3 flex flex-col items-center justify-center gap-1.5 text-center border-border/80",
                    action.className
                  )}
                >
                  {action.icon}
                  <span className="text-center">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
