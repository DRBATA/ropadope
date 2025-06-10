"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { ChevronDown, ChevronRight, HelpCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import type { LucideIcon } from "lucide-react"

export interface SymptomCardProps {
  title: string
  icon: string
  options?: string[]
  selected?: boolean
  status?: "present" | "absent" | "unknown"
  severity?: "mild" | "moderate" | "severe"
  duration?: string
  confidence?: number
  onSelect?: () => void
  onStatusChange?: (status: "present" | "absent" | "unknown") => void
  onSeverityChange?: (severity: "mild" | "moderate" | "severe") => void
  className?: string
}

export function SymptomCard({
  title,
  icon,
  options,
  selected = false,
  status = "unknown",
  severity,
  duration,
  confidence,
  onSelect,
  onStatusChange,
  onSeverityChange,
  className,
}: SymptomCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Use a properly typed approach for icons
  const [IconComponent, setIconComponent] = React.useState<LucideIcon>(() => HelpCircle)
  
  React.useEffect(() => {
    // Import the icon dynamically
    const iconName = icon.charAt(0).toUpperCase() + icon.slice(1)
    import('lucide-react')
      .then(mod => {
        const Icon = mod[iconName as keyof typeof mod] || mod.HelpCircle
        setIconComponent(() => Icon as LucideIcon)
      })
      .catch(() => setIconComponent(() => HelpCircle))
  }, [icon])

  const statusColors = {
    present: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    absent: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
    unknown: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  }

  const severityColors = {
    mild: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    moderate: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    severe: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  }

  const renderStatusIcon = () => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        selected ? "ring-2 ring-primary ring-offset-1" : "ring-0",
        className
      )}
    >
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md flex items-center justify-center">
            <IconComponent className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("text-xs px-2 py-0.5 rounded-full border flex items-center gap-1", statusColors[status])}>
            {renderStatusIcon()}
            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>
          {confidence !== undefined && (
            <div className="text-xs text-muted-foreground ml-1">{Math.round(confidence * 100)}%</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {duration && <p className="text-xs text-muted-foreground">Duration: {duration}</p>}
          
          {severity && (
            <div className={cn("text-xs px-2 py-1 rounded-md inline-block", severityColors[severity])}>
              Severity: {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-1">
            {onStatusChange && (
              <>
                <Button
                  size="sm"
                  variant={status === "present" ? "default" : "outline"}
                  className="text-xs h-7 px-2"
                  onClick={() => onStatusChange("present")}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={status === "absent" ? "default" : "outline"}
                  className="text-xs h-7 px-2"
                  onClick={() => onStatusChange("absent")}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  No
                </Button>
                <Button
                  size="sm"
                  variant={status === "unknown" ? "default" : "outline"}
                  className="text-xs h-7 px-2"
                  onClick={() => onStatusChange("unknown")}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Sure
                </Button>
              </>
            )}
          </div>

          {options && options.length > 0 && (
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs w-full justify-between"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span>More Details</span>
                <ChevronDown className={`h-3 w-3 transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
              {isOpen && (
                <div className="mt-2 space-y-1 animate-fadeIn">
                  {options.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant="ghost"
                      className="text-xs w-full justify-start hover:bg-primary/5"
                      onClick={() => {
                        // Handle option selection here
                        if (onSeverityChange && (option === "Mild" || option === "Moderate" || option === "Severe")) {
                          onSeverityChange(option.toLowerCase() as "mild" | "moderate" | "severe")
                        }
                      }}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
