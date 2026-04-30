# CHANGELOG - TimelineGame Feature

## Date: 2026-04-29

### Overview
Added **TimelineGame** - a new mini-game where 4 players collaborate to reconstruct a 16-step story timeline in chronological order.

---

### Backend Files Created

| File | Description |
|------|-------------|
| `PVPBack.Core/Realtime/MiniGames/Games/Timeline/TimelineGame.cs` | Main game implementation (IMiniGame) |
| `PVPBack.Core/Realtime/MiniGames/Games/Timeline/TimelineCard.cs` | Data models (TimelineCard, StoryTemplate) |

---

### Backend Files Modified

| File | Changes |
|------|---------|
| `PVPBack.Core/Realtime/MiniGamePipeline.cs` | Added `new MiniGames.TimelineGame()` to `CreateDefaultPipeline()` |

---

### Frontend Files Created

| File | Description |
|------|-------------|
| `pvpfront/src/games/Timeline/TimelineGamePage.tsx` | Main React component |
| `pvpfront/src/games/Timeline/TimelineGamePage.module.css` | Styles (CSS Modules) |

---

### Frontend Files Modified

| File | Changes |
|------|---------|
| `pvpfront/src/games/GameSessionRouter.tsx` | Added import and case for `Timeline` game type |

---

### New Game: TimelineGame

**Objective:** 4 players collaborate to reconstruct a 16-step story timeline in chronological order.

**Features:**
- 3 hardcoded story templates ("The Lost Artifact", "Space Station Omega", "The Midnight Courier")
- 16 timeline cards per story (shuffled and dealt: 4 cards per player)
- 16-slot shared timeline for collaborative placement
- **Actions:**
  - `place_card`: Place a card from hand to a specific slot
  - `remove_card`: Return a card from timeline to hand
  - `verify`: Verify the entire timeline (requires all 16 slots filled)
- **Lives System:** 3 lives total; lose 1 life per failed verification
- **Win/Loss:** Game completes successfully if timeline is correct; game fails if lives reach 0

**State Separation:**
- `GetPublicState()`: Returns timeline slots, current lives, game status (no answers exposed)
- `RefreshPlayerPrivateData()`: Returns only cards in player's hand

---

### Usage
TimelineGame is automatically added as the 4th game in the pipeline (after Lasers, Connections x2).

---

---

## Change Game Override Feature

### Date: 2026-04-29

Added ability to manually override the active game in a live session for testing/development purposes.

### Backend Files Modified

| File | Changes |
|------|---------|
| `PVPBack.Core/Realtime/GameSessionRuntime.cs` | Added `TryChangeActiveGame(int gameIndex)` method |
| `PVPBack.Api/Hubs/GameHub.cs` | Added `ChangeGame(sessionCode, gameNumberInList)` hub method |
| `PVPBack.Api/GameSessionTimerSupport.cs` | Added `ResetTimer(sessionCode)` method |

### Additional Changes
- Timer now resets to 10 minutes when manually changing games
- Debug panel now shows exactly 3 games (Lasers, Connections, Timeline)

### Frontend Files Created

| File | Description |
|------|-------------|
| `pvpfront/src/components/DebugPanel/DebugPanel.tsx` | Debug panel component |
| `pvpfront/src/components/DebugPanel/DebugPanel.module.css` | Debug panel styles |

### Frontend Files Modified

| File | Changes |
|------|---------|
| `pvpfront/src/services/signalr.ts` | Added `changeGame(sessionCode, gameNumberInList)` function |
| `pvpfront/src/games/GameSessionRouter.tsx` | Integrated DebugPanel to show game override controls |

### Usage

**Backend (C#):**
```csharp
// In SignalR hub or other code:
var session = sessionManager.Get(sessionCode);
session.TryChangeActiveGame(2); // Switch to game at index 2 (0-based)
```

**Frontend (TypeScript):**
```typescript
import { changeGame } from "./services/signalr";

// Switch to game 2 (1-based: Lasers=1, Connections=2, Timeline=3)
await changeGame("ABC123", 2);
```

**Debug UI:**
- A collapsible "Debug" button appears in the bottom-left of the game view
- Click to expand and see buttons for each game in the pipeline
- Click a game button to manually switch to that game

### Breaking Changes
None.

---

## Bug Fixes

### Date: 2026-04-29

**Fixed data binding in TimelineGamePage** by adding PascalCase/camelCase fallbacks in normalization functions. The backend may send either format (e.g., `Timeline` or `timeline`), so the code now checks both.

**Fixed chat panel visibility** by adjusting CSS media queries. The chat panel was incorrectly hidden at 1200px breakpoint on standard desktop screens. Added a 768px breakpoint to restore visibility on mobile/tablet while keeping it hidden only on very small screens.

### Files Modified
- `pvpfront/src/games/Timeline/TimelineGamePage.tsx` - Updated `normalizePublicState()` and `normalizePrivateData()` with fallbacks
- `pvpfront/src/games/Timeline/TimelineGamePage.module.css` - Adjusted media query breakpoints

### Note
Implemented click-to-select and place/remove interaction logic in TimelineGamePage.

---

## Bug Fixes

### Date: 2026-04-29

**Fixed responsive layout for Chat panel in TimelineGame.** Added media query at 1024px to stack chat below game board on tablet/mobile while keeping players panel hidden at all responsive sizes.

**Updated TimelineGame state to hide placed card contents from non-owners and restrict removal to the owner.**
- Backend now tracks `OwnerId` for each timeline slot
- Public state only exposes `IsFilled`, `OwnerId`, `OwnerNickname` (no card details)
- Private state includes `PlacedCards` array with card details for owner's cards
- `remove_card` action now validates `slot.OwnerId == requestingPlayer.PlayerId`

**Matched TimelineGame CSS color scheme with standard game themes.** Applied Lasers game theme (dark gradient background #0E1B2B, teal panels #072b28e1 with #059669 borders, 18px border-radius) to Timeline game for visual consistency.

### Files Modified
- `pvpfront/src/games/Timeline/TimelineGamePage.tsx` - Updated `normalizePublicState()` and `normalizePrivateData()` with fallbacks
- `pvpfront/src/games/Timeline/TimelineGamePage.module.css` - Adjusted media query breakpoints