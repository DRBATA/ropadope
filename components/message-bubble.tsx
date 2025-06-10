"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { motion } from "framer-motion"

export interface MessageOption {
  id: string
  text: string
  onClick: () => void
}

export interface MessageBubbleProps {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp?: Date
  options?: MessageOption[]
  isLoading?: boolean
  isTyping?: boolean
}

export function MessageBubble({
  id,
  content,
  sender,
  timestamp,
  options,
  isLoading = false,
  isTyping = false,
}: MessageBubbleProps) {
  const isUser = sender === "user"
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "max-w-[80%] p-3.5 rounded-xl shadow-sm",
          isUser
            ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 rounded-br-sm border border-amber-600/50"
            : "bg-card text-card-foreground rounded-bl-sm border border-border"
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {isLoading || isTyping ? (
            <div className="flex items-center h-6">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : (
            content
          )}
        </div>
        
        {options && options.length > 0 && !isLoading && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={option.onClick}
                className="text-xs bg-background/80 hover:bg-muted border-primary/60 text-primary hover:border-primary"
              >
                {option.text}
              </Button>
            ))}
          </div>
        )}
        
        {timestamp && (
          <div className={cn(
            "text-[10px] mt-1",
            isUser ? "text-amber-900/70" : "text-muted-foreground"
          )}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
