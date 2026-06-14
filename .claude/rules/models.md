---
paths:
  - 'src/models/**'
  - 'src/services/Models/**'
---

# Model rules

Two distinct model folders — keep them separate:

| Folder             | Purpose                                                           | Examples                                                                          |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `services/Models/` | API / domain shapes that flow in and out of `RpgAssistantService` | `Character`, `VersionedCharacter`, `PageQuery`, `UpdateCharacter`, `RelationPath` |
| `models/`          | UI-only shapes wrapping the API models for the view layer         | `CharacterNode` (wraps `Character` for `v-network-graph`), `KnowEdge`             |

UI models live closer to the view; do not push them down into `services/`.
