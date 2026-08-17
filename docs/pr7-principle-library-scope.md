# Principle: Library routing must respect the same tenant boundary as the source

A watched source can attach synchronized knowledge only to a Library in its own Node/Workspace. PR #7 checks this in application code and reinforces it with database constraints.
