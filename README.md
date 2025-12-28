# Twitter Fast Block Button Extension

Add block/unblock buttons next to usernames on Twitter/X for faster moderation.

## Features

- **Block/Unblock button** next to every username (tweets, replies, comments)
- **Normal Twitter confirmation dialog** for blocking
- **Toggle state**: Shows "Block" or "Unblock" based on Twitter's block state
- **Excludes own tweets**: No button on your own content
- **Works everywhere**: Timeline, replies, comments, verified/promoted accounts
- **Retweets**: Two buttons - block retweeter AND original author
- **Quote tweets**: Two buttons - block quoter AND quoted user
- **Always visible**: Button next to username
- **Twitter-styled**: Matches Twitter's native button appearance

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Toggle "Developer mode" (top right corner)
3. Click "Load unpacked" and select this folder
4. Refresh any Twitter/X page to see the block buttons

## Usage

- **Block a user**: Click the "Block" button next to their username
- **Unblock a user**: Click the "Unblock" button next to their username
- The button will show the normal Twitter confirmation dialog
- Works on timeline, replies, comments, retweets, and quote tweets

## How It Works

- Automatically detects new tweets as you scroll (infinite scroll)
- Injects block buttons next to usernames
- When clicked, simulates clicking Twitter's "more" menu and "Block" option
- Toggles between Block/Unblock based on Twitter's block state

## Architecture

### Project Structure

```
fast-block-button-twitter/
├── manifest.json          # Chrome extension configuration
├── content.js             # Main content script (395 lines)
├── styles.css             # Button styling
├── icon16.png             # 16x16 extension icon
├── icon48.png             # 48x48 extension icon
├── icon128.png            # 128x128 extension icon
└── README.md              # Documentation
```

### Component Breakdown

#### 1. `manifest.json` (Extension Configuration)
- Defines the extension as Manifest V3
- Specifies content scripts that run on twitter.com and x.com
- Sets up icon resources for the extension
- Configures version and description metadata

#### 2. `content.js` (Core Logic)

The content script is divided into several functional modules:

**A. State Management (Lines 1-11)**
- `currentUsername`: Stores the logged-in user's handle
- `processedTweets`: Set of tweet keys to avoid duplicate processing
- `processedProfiles`: Set of profile keys to avoid duplicate processing
- `DEBUG`: Toggle flag for debug logging (disabled by default)
- `debugLog()`: Conditional logging utility

**B. User Detection (Lines 13-50)**
- `getCurrentUsername()`: Detects logged-in user from multiple Twitter UI elements
- Searches through navigation, sidebars, and profile links
- Falls back to URL parsing if UI elements aren't available
- Logs detection method when debug mode is enabled

**C. Tweet Parsing (Lines 52-89)**
- `getTweetId()`: Extracts unique tweet ID from status URL
- `getUsernameFromElement()`: Extracts username with dual fallback methods
  - Primary: Finds span with `@` prefix
  - Fallback: Extracts from link href
- `isOwnTweet()`: Compares tweet username with current username
- `findMoreButton()`: Locates Twitter's "more" menu button using `data-testid="caret"`

**D. Button Creation (Lines 91-130)**
- `createBlockButton()`: Creates the block button element
- Sets up click event listener with async error handling
- Stores username in dataset for reference

**E. Block Action Handler (Lines 132-170)**
- `handleBlockAction()`: Main blocking logic
  1. Finds and clicks Twitter's "more" button
  2. Waits for dropdown menu to appear
  3. Searches for the "Block @username" menu item
  4. Clicks the block option
  5. Waits for confirmation dialog
  6. Sets up MutationObserver to handle dialog closure (works for both confirm AND cancel)
- `waitForDropdown()`: Polls for dropdown appearance (50ms intervals)
- `waitForConfirmationDialog()`: Polls for confirmation dialog (50ms intervals)

**F. Tweet Injection (Lines 200-267)**
- `injectBlockButtons()`: Main injection routine (completely rewritten)
  1. Uses fallback selector chain for tweet elements
  2. Extracts unique tweet IDs for deduplication
  3. Ensures current username is detected
  4. Skips already processed tweets with debug logging
  5. Enhanced username extraction with fallbacks
  6. Excludes own tweets
  7. Creates and inserts block button before "more" button
  8. Logs all operations for debugging

**G. DOM Observation (Lines 269-279)**
- `observeNewTweets()`: Sets up MutationObserver on document body
  - Watches for childList and subtree changes
  - Triggers button injection when DOM updates
  - Handles Twitter's infinite scroll and dynamic content loading

**H. Profile Page Support (Lines 281-375)**
- `injectProfileBlockButton()`: Special handling for profile pages
  1. Detects if current page is a user profile
  2. Excludes own profile page
  3. Finds user bio section using `data-testid="UserDescription"`
  4. Creates and appends block button to bio container
  5. Handles block action similar to tweets
  6. Enhanced with debug logging

**I. Initialization (Lines 377-393)**
- `init()`: Entry point that handles page load states (completely rewritten)
  1. Waits for DOMContentLoaded if page is loading
  2. Starts MutationObserver immediately
  3. Runs immediate button injection
  4. Multiple retry calls over 2-second window
  5. Supports both loading and loaded page states

#### 3. `styles.css`
- Defines `.fast-block-button` styling for tweet buttons
- Minimal CSS with only `margin-right: 4px`
- All styling inherited from cloned Twitter elements

### Data Flow

```
Page Load (after 1s delay)
    ↓
init() called
    ↓
observeNewTweets() - starts immediately watching DOM
    ↓
injectBlockButtons() - processes existing tweets immediately
    ↓
getCurrentUsername() - detects logged-in user (called if not set)
    ↓
For each tweet found:
  - Extract unique tweet ID from URL
  - Check if already processed (deduplication)
  - Extract username with fallback methods
  - Check if it's user's own tweet
  - Find More button
  - Create and insert block button
  - Mark as processed
    ↓
injectProfileBlockButton() - if on profile page (500ms later)
    ↓
Retry injection (1s later) - catches any missed tweets
    ↓
Retry profile injection (1.5s later) - final sweep
    ↓
User clicks block button
    ↓
handleBlockAction()
    ↓
Click Twitter's more button → Wait for dropdown
    ↓
Find "Block @username" in dropdown → Click it
    ↓
Wait for confirmation dialog → User confirms OR cancels
    ↓
MutationObserver detects dialog close → Cleanup (closes dropdown if still open)
```

**Key Changes:**
- Observer starts immediately (no 1.5s delay)
- Multiple retry calls ensure 100% tweet coverage
- Tweet ID-based deduplication prevents false duplicates
- Fallback selectors handle Twitter DOM changes

### Key Design Decisions

1. **Content Script Only**: No background scripts or service workers needed
2. **Event-Driven**: Uses MutationObserver for efficient DOM watching
3. **Immediate Observer**: Observer starts immediately, eliminating timing gaps
4. **Deduplication**: Unique tweet IDs prevent processing same tweet multiple times
5. **Retry Strategy**: Multiple injection calls over 2-second window ensure complete coverage
6. **Fallback Selectors**: Multiple selector chains provide resilience against Twitter DOM changes
7. **Enhanced Username Extraction**: Dual-method extraction (span + link) covers more cases
8. **Async/Await**: Handles asynchronous UI interactions cleanly
9. **Twitter Native Integration**: Uses Twitter's own UI elements rather than API calls
10. **Polling with Timeouts**: Simple approach for waiting on dynamic elements
11. **Debug Logging**: Conditional logging for troubleshooting without performance impact
12. **Dialog Cleanup**: MutationObserver ensures dropdown closes whether user confirms OR cancels block action - prevents UI from getting stuck in intermediate state

### Extension Lifecycle

1. **Loading**: `manifest.json` is parsed, content scripts are registered
2. **Initialization**: `init()` called after 1s delay to ensure Twitter UI is ready
3. **Observer Start**: MutationObserver starts immediately (no additional delay)
4. **Initial Injection**: Processes all currently visible tweets
5. **Retry Injection**: Two additional sweeps over 2 seconds catch any missed tweets
6. **Active**: MutationObserver watches DOM changes continuously, buttons injected dynamically
7. **Interaction**: User clicks buttons, async actions performed
8. **Cleanup**: Observers disconnected when no longer needed

**Reliability Improvements:**
- No timing gaps between initial scan and observer start
- Multiple retry calls ensure 100% tweet coverage
- Fallback selectors handle Twitter DOM changes
- Tweet ID-based deduplication prevents false duplicates

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

- Check existing issues first to avoid duplicates
- Include your browser version and OS
- Describe the bug or feature request clearly
- Provide screenshots if applicable

### Pull Requests

1. Fork this repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly on Twitter/X
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature-name`
7. Submit a pull request

### Development Setup

1. Clone the repository
2. Load the extension in Chrome (see Installation)
3. Make changes to `content.js` or `styles.css`
4. Reload the extension in `chrome://extensions`
5. Refresh Twitter/X to see changes

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Keep the extension lightweight and performant

## License

MIT License - feel free to use, modify, and distribute

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
