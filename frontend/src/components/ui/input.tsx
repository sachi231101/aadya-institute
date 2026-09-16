import * as React from "react"

import { cn } from "@/utils"

const inputClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

/** Keep typed digits. Empty stays empty, and a leading 0 is not left in the field. */
export function sanitizeNumericText(raw: string): string {
  if (raw === "") return ""

  const negative = raw.startsWith("-")
  let body = raw.replace(/-/g, "").replace(/[^\d.]/g, "")
  const dot = body.indexOf(".")
  if (dot !== -1) {
    body = body.slice(0, dot + 1) + body.slice(dot + 1).replace(/\./g, "")
  }
  if (body.length > 1 && body.startsWith("0") && body[1] !== ".") {
    body = body.replace(/^0+/, "")
  }
  if (body.startsWith(".")) body = `0${body}`
  if (body === "") return negative ? "-" : ""
  return `${negative ? "-" : ""}${body}`
}

function idleNumericValue(value: unknown): string {
  if (value == null || value === "") return ""
  const text = String(value)
  if (text === "0" || text === "0.0" || Number(text) === 0) return ""
  return sanitizeNumericText(text)
}

/** Value parents can safely pass to Number(). Incomplete drafts commit as blank, not NaN. */
function commitNumericText(next: string): string {
  if (next === "" || next === "-" || next === "." || next === "-.") return ""
  if (next.endsWith(".")) return next.slice(0, -1)
  return next
}

const NumericInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (props, ref) => {
    const {
      className,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      type: _type,
      ...rest
    } = props
    const isControlled = Object.prototype.hasOwnProperty.call(props, "value")
    const [draft, setDraft] = React.useState<string | null>(null)
    const shown = draft ?? (isControlled ? idleNumericValue(value) : "")

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(inputClassName, className)}
        {...(isControlled
          ? { value: shown }
          : {
              defaultValue:
                defaultValue === 0 || defaultValue === "0" ? "" : defaultValue,
            })}
        onFocus={(event) => {
          if (isControlled) setDraft(idleNumericValue(value))
          onFocus?.(event)
        }}
        onChange={(event) => {
          const next = sanitizeNumericText(event.target.value)
          if (isControlled) setDraft(next)
          event.target.value = commitNumericText(next)
          onChange?.(event)
          if (!isControlled) event.target.value = next
        }}
        onBlur={(event) => {
          setDraft(null)
          onBlur?.(event)
        }}
      />
    )
  }
)
NumericInput.displayName = "NumericInput"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "number") {
      return <NumericInput ref={ref} type={type} className={className} {...props} />
    }

    return (
      <input
        type={type}
        className={cn(inputClassName, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
