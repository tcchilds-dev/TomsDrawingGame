# Drawing Game Rewrite Plan

## Purpose

This is a personal portfolio project intended to demonstrate clean backend code, taste, and practical design decisions. It is not intended to be a feature-rich, large-scale production application.

We will explicitly avoid feature bloat, unnecessary abstraction, and a crowded UI. The goal is minimalism and elegance: add no more than is needed.

## Project Direction

Tom is using this project primarily to develop and demonstrate backend skills. Tom will build the backend, and Codex will build the frontend against contracts agreed upon together.

The application's visual style is largely already established and should remain untouched for the most part. Frontend work should focus on adding functionality within that style. New UI should be introduced only where the product requires it, such as the results screen, and should remain consistent with the existing design.

Tom has final authority over features and styling.

## Ownership

### Tom

- Backend implementation and architecture
- Persistence and data modelling
- Backend tests
- Final authority over features and styling
- Manual browser testing and confirmation when needed

### Codex

- Frontend implementation
- Frontend state management
- Frontend tests, where useful, without Playwright
- Integration of the frontend with the agreed backend contract

Codex will not silently edit backend code. If frontend integration exposes a backend issue, Codex will explain the issue and the exact change needed. Tom will decide whether and how to implement that change.

## Contract-First Feature Cycle

Work will proceed in small vertical slices:

1. Tom and Codex agree on the feature, its scope, and its acceptance criteria.
2. Codex describes the observable backend capabilities required by the frontend, including as applicable:
   - HTTP endpoints or real-time events
   - Request and response models
   - Validation behaviour
   - Error behaviour and error payloads
   - Authentication and authorization requirements
   - Example payloads
3. Either Tom or Codex may challenge the proposed contract if it creates unnecessary complexity on the other side.
4. Tom implements and tests the backend, choosing its internal design and architecture.
5. Codex implements the frontend and connects it to the agreed contract.
6. Codex performs appropriate non-Playwright checks and reports what still requires manual verification.
7. Tom manually tests the browser experience when needed and confirms the result.
8. Any contract mismatch is discussed explicitly and resolved before the slice is considered complete.

We will integrate these small slices regularly instead of building the backend and frontend independently for long stretches.

## Feature Contract Template

When useful, a feature contract should cover:

```md
## Feature

### User behaviour

### Scope and non-goals

### Backend capabilities needed

### HTTP endpoints / real-time events

### Data models and example payloads

### Validation and error cases

### Authentication and authorization

### Acceptance criteria
```

The contract describes externally observable behaviour, not the backend's internal implementation. Tom retains control of how the backend fulfils it.

## Working Principles

- Prefer the smallest coherent implementation that satisfies the feature.
- Preserve the existing visual language unless Tom explicitly approves a change.
- Avoid speculative flexibility, premature abstraction, and features without a current need.
- Keep contracts, responsibilities, and integration problems explicit.
- Favour readable, maintainable code and practical decisions over demonstrations of complexity.
- Do not use Playwright to test the frontend. Tom will manually verify browser behaviour when required.
