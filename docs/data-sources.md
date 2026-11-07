# Data sources

## Manual JSON import (current)

Use an export from Idleon Toolbox or another trusted save-export workflow. The web app parses JSON locally in the browser. It currently displays the document structure but does not assume a particular schema or map account fields without verification.

## Browser game capture (planned)

A Manifest V3 extension directory is included as a scaffold only. It currently does not inspect, intercept, or modify game network traffic. Before implementing capture, validate the actual response shape, identify the minimum required fields, and keep all processing local. Never request game passwords, session cookies, or authentication tokens.

## Steam (planned)

A Steam save export can be imported through the same JSON picker once the schema adapter is implemented. Any third-party extraction tool is unofficial. Prefer read/export-only operations, back up saves, and never write encoded data back to the live save database.
