"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#000",
          color: "#fff"
        }}>
          <h2>Something went wrong</h2>
          <button onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#C9A55C",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
