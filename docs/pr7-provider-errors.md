# Provider error normalization

PR #7 normalizes provider failures into CERVEL source errors such as metadata/download failure and reauthorization required. Provider-specific status/body details should be logged carefully in a future observability layer without persisting access tokens or sensitive response payloads into user-visible health messages.
