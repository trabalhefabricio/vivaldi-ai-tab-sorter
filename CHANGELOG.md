# Changelog

All notable changes to the **Vivaldi AI Tab Sorter** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v3.0.0] - 2026-03-01

### Added
- Multi-provider AI support: Google Gemini, OpenAI (GPT-4o / GPT-4o-mini / GPT-4.1), and Anthropic Claude (Sonnet 4 / 3.5 Sonnet / 3.5 Haiku)
- Model selection dropdowns for all three AI providers (Gemini dynamically fetched)
- Unit test suite with automated validation
- Browser auto-detection (Vivaldi vs Chrome) with adaptive feature set
- Smart tab chunking for 100+ tabs (80 tabs per AI request)
- Extension icon set (16 / 48 / 128 px)
- UI toggles for duplicate removal and uncategorized tab handling
- Content Security Policy meta tag restricting API connections
- GitHub Actions release workflow for tagged versions (`v*` → GitHub Release with zip)
- Retry logic with exponential backoff for OpenAI and Claude API calls

### Changed
- Implemented all answers from the project questionnaire
- Improved provider-agnostic prompt engineering
- Window mode creates empty window first to avoid closing source window

### Fixed
- `ai_bridge.js` now passes `includeUncategorized`/`reassignExisting` from commands
- Replaced `innerHTML` usage with safe DOM APIs (`textContent`, `replaceChildren`)
- Window mode blank tab detection handles pending/empty URL states
- Defensive guard against empty windows array in Tab Stacks "all windows" scope
- Logic rules input now sanitized consistently with categories input

### Security
- Added `Content-Security-Policy` meta tag to popup restricting `connect-src` to API domains
- Sanitized `logicRules` input to strip HTML tags (matching categories sanitization)

## [v2.1.0] - 2026-03-01

### Added
- Workspace auto-detection via `vivaldi.workspaces` API probe
- One-click bridge install script download from the popup
- Workspace restore / reassign-existing toggle
- Project questionnaire documenting design decisions (`QUESTIONNAIRE.md`)

### Fixed
- Bridge script now correctly injects into Vivaldi pages

## [v2.0.0] - 2026-01-13

This release consolidates PRs #3 – #8 into a major rewrite.

### Added
- Gemini model selection dropdown (pick any available model)
- Colored and named Tab Stacks with scope options (current window / all windows)
- Enhanced Windows mode with smarter distribution
- Multi-strategy JSON extraction from AI responses (regex, block, repair)
- Comprehensive test suite for AI response parsing
- Vivaldi-native tab stacking via `vivaldi.tabsPrivate` bridge (`ai_bridge.js`)
- Manual testing documentation and error-collection tooling
- Diagnostic tools: 20 automated tests covering Vivaldi-specific APIs

### Fixed
- Request counter bug that caused premature "quota exceeded" errors
- AI response parsing failures (`Failed to parse AI response`)
- Silent tab-sorting failures: replaced `getCurrent` with `getLastFocused` for correct window context
- Result validation to confirm tabs actually moved
- Empty-windows crash when a category has zero matching tabs
- Duplicate tab leak during reorganisation
- Error propagation so failures surface in the popup
- Division-by-zero guard in progress calculations

### Changed
- Replaced `chrome.tabGroups` with Vivaldi-native `vivaldi.tabsPrivate` via bridge script
- Improved error messages with sanitised, user-friendly descriptions

## [v1.1.0] - 2026-01-12

### Fixed
- Invalid `content_scripts[0].matches[0]` manifest scheme error
- XSS vulnerabilities: replaced `innerHTML` with `textContent` throughout

### Added
- Rate limiting (15 RPM with 4 s throttle)
- Daily request tracking with 1 400-request cap (under Google's 1 500 free-tier limit)

### Security
- Sanitised all dynamic DOM insertions to prevent cross-site scripting

## [v1.0.0] - 2026-01-12

### Added
- Initial release of the Vivaldi AI Tab Sorter extension
- Google Gemini AI integration for intelligent tab categorisation
- Three organisation modes: Workspaces, Tab Stacks, and Windows
- Bridge script (`ai_bridge.js`) for Vivaldi private API access
- Popup UI with API key input, category editor, and preview panel
- Persistent settings via `chrome.storage.local`
- Custom sorting rules support

[v3.0.0]: https://github.com/trabalhefabricio/vivaldi-ai-tab-sorter/compare/v2.1.0...HEAD
[v2.1.0]: https://github.com/trabalhefabricio/vivaldi-ai-tab-sorter/compare/v2.0.0...v2.1.0
[v2.0.0]: https://github.com/trabalhefabricio/vivaldi-ai-tab-sorter/compare/v1.1.0...v2.0.0
[v1.1.0]: https://github.com/trabalhefabricio/vivaldi-ai-tab-sorter/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/trabalhefabricio/vivaldi-ai-tab-sorter/releases/tag/v1.0.0
