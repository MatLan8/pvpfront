# TimelineGame Debug Findings

## Date: 2026-04-29

---

## 1. Data Binding Issues

### Root Cause

The `TimelineGamePage.tsx` uses PascalCase property names in its `normalizePublicState()` function, which should work with the backend's PascalCase output:

**Backend sends (TimelineGame.cs - GetPublicState):**
```csharp
new {
    GameType = "Timeline",
    Status = "running",
    Lives = _currentLives,
    MaxLives,
    Timeline = timeline,
    FilledSlots = _timelineSlots.Values.Count(v => v is not null),
    TotalSlots = 16
}
```

**Frontend expects (TimelineGamePage.tsx - normalizePublicState):**
```typescript
const timeline = Array.isArray(obj.Timeline)  // PascalCase - matches
    ? obj.Timeline.map(...)
```

**However**, the Lasers game uses a **fallback pattern** that handles both camelCase and PascalCase:

```typescript
// From Lasers normalizeBackend.ts
const statusRaw = (g.status ?? g.Status ?? "running") as string;
```

**TimelineGamePage.tsx does NOT use this fallback pattern** - it directly accesses PascalCase properties. While this should work, the safer approach is to add fallbacks.

### Additional Issue: Data Flow Variables

TimelineGamePage uses slightly different variable naming:
- `publicStateRaw` (from context)
- `gameStateRaw` (derived from `publicStateRaw?.game`)
- `gameState` (normalized result)

While ConnectionsGamePage uses:
- `publicState` (from context, cast to type)
- `gameState` (derived from `publicState?.game`)

This is inconsistent but should still work.

### Fix Required

Update `TimelineGamePage.tsx` normalize functions to use fallback pattern like Lasers:

```typescript
function normalizePublicState(raw: unknown): TimelineGamePublic | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const timeline = Array.isArray(obj.Timeline ?? obj.timeline)
    ? (obj.Timeline ?? obj.timeline).map(...)
    : [];
  // ... similar fallbacks for all properties
}
```

---

## 2. Missing Chat Box

### Root Cause

The Chat Box **code is present** in `TimelineGamePage.tsx`:

```tsx
import GameChat from "../../components/GameChat/GameChat";

// ...

<aside className={styles.chatPanel}>
  <GameChat sessionCode={sessionCode!} playerId={playerId!} />
</aside>
```

However, the CSS hides it in the responsive layout:

**File:** `TimelineGamePage.module.css` (lines 426-430)
```css
@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .playersPanel,
  .chatPanel {
    display: none;  /* <-- THIS HIDES THE CHAT */
  }
}
```

At screen widths below 1200px, the chat panel is hidden. This is likely being triggered on the user's screen.

### Fix Required

Either:
1. Change the CSS to not hide chat panel, OR
2. Ensure the user is viewing at a resolution > 1200px, OR  
3. Remove the responsive hiding if that's unwanted behavior

---

## 3. Next Steps - Exact Code Changes

### A. Fix Data Binding in TimelineGamePage.tsx

Replace the `normalizePublicState` function with fallback pattern:

```typescript
function normalizePublicState(
  raw: unknown,
): TimelineGamePublic | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const timelineArray = obj.Timeline ?? obj.timeline;
  const timeline = Array.isArray(timelineArray)
    ? timelineArray.map((item) => {
        if (!item || typeof item !== "object") return null;
        const card = item as Record<string, unknown>;
        return {
          Id: card.Id ?? card.id as string,
          Title: card.Title ?? card.title as string,
          Description: card.Description ?? card.description as string,
        };
      })
    : [];

  return {
    GameType: String(obj.GameType ?? obj.gameType ?? ""),
    Status: (obj.Status ?? obj.status ?? "running") as "running" | "completed" | "failed",
    Lives: Number(obj.Lives ?? obj.lives ?? 3),
    MaxLives: Number(obj.MaxLives ?? obj.maxLives ?? 3),
    Timeline: timeline,
    FilledSlots: Number(obj.FilledSlots ?? obj.filledSlots ?? 0),
    TotalSlots: Number(obj.TotalSlots ?? obj.totalSlots ?? 16),
  };
}
```

Similarly update `normalizePrivateData`:

```typescript
function normalizePrivateData(raw: unknown): TimelinePlayerPrivate {
  if (!raw || typeof raw !== "object") {
    return { Hand: [], HandCount: 0 };
  }

  const obj = raw as Record<string, unknown>;

  const handArray = obj.Hand ?? obj.hand;
  const hand = Array.isArray(handArray)
    ? handArray.map((item) => {
        if (!item || typeof item !== "object") return null;
        const card = item as Record<string, unknown>;
        return {
          Id: card.Id ?? card.id as string,
          Title: card.Title ?? card.title as string,
          Description: card.Description ?? card.description as string,
        };
      }).filter((c): c is TimelineCard => c !== null)
    : [];

  return {
    Hand: hand,
    HandCount: Number(obj.HandCount ?? obj.handCount ?? hand.length),
  };
}
```

### B. Fix Chat Panel Visibility (Optional)

In `TimelineGamePage.module.css`, either:
- Remove the `.chatPanel { display: none; }` rule, OR
- Change the breakpoint to a smaller value like 768px

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Empty timeline/hand data | No fallback for property case | Add `??` fallbacks in normalize functions |
| Missing chat box | CSS hides it below 1200px | Update CSS or view at larger resolution |

The data binding issue is the most critical - the normalize functions need to handle both PascalCase (backend) and potential camelCase variants for robustness.