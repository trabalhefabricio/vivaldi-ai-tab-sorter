# Vivaldi Tab Stacking API Research

## Key Findings

### 1. Chrome TabGroups API (NOT SUPPORTED IN VIVALDI)
- `chrome.tabs.group(options)` - Creates a tab group
- `chrome.tabGroups.update(groupId, updateProperties)` - Updates group properties
- **These APIs DO NOT exist in Vivaldi**

### 2. Vivaldi Tab Stacking API
Vivaldi uses its own proprietary APIs accessible through the `vivaldi` namespace:

#### vivaldi.tabsPrivate API (Most Relevant)
This is Vivaldi's private tab API that extends Chrome's standard tabs API.

Key methods for tab stacking:
- `vivaldi.tabsPrivate.insertIntoTabStack(tabId, parentTabId)` - Inserts a tab into a stack
- `vivaldi.tabsPrivate.removeFromTabStack(tabId)` - Removes a tab from a stack
- `vivaldi.tabsPrivate.setTabStackCollapsed(tabId, collapsed)` - Collapses/expands a stack
- Tab stacks in Vivaldi are hierarchical - one tab is the "parent" and others are children

#### Key Differences from Chrome:
1. **No Group IDs**: Vivaldi doesn't use group IDs. Stacks are based on parent-child relationships.
2. **No Colors/Titles**: Vivaldi tab stacks don't have colors or titles like Chrome groups.
3. **Hierarchical**: One tab must be the "parent" of the stack.
4. **Visual Only**: Stacks are primarily a visual grouping mechanism.

### 3. Implementation Strategy for Vivaldi

For **Tab Stacks Mode**:
1. For each category, pick the first tab as the "parent"
2. Use `vivaldi.tabsPrivate.insertIntoTabStack()` to add remaining tabs to that parent
3. This creates a collapsible stack of tabs

For **Windows Mode**:
1. Create separate windows (already works with chrome.windows API)
2. DO NOT try to use tabGroups - just organize tabs into windows
3. Remove the tabGroups calls entirely

For **Workspaces Mode**:
1. Already implemented via bridge script
2. Uses vivaldi.workspaces API correctly

### 4. Required Changes

**popup.js**:
- Replace `chrome.tabs.group()` with Vivaldi tab stacking logic
- Replace `chrome.tabGroups.update()` with appropriate Vivaldi methods
- Check if `vivaldi.tabsPrivate` exists before using

**manifest.json**:
- Remove `tabGroups` permission (Chrome-specific)

**Error Handling**:
- Add checks for Vivaldi-specific APIs
- Provide clear error messages if APIs are unavailable
