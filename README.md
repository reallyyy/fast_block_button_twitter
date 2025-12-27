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
├── content.js             # Main content script (268 lines)
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

**A. State Management (Lines 1-3)**
- `currentUsername`: Stores the logged-in user's handle
- `processedTweets`: Set of tweet keys to avoid duplicate processing
- `processedProfiles`: Set of profile keys to avoid duplicate processing

**B. User Detection (Lines 5-34)**
- `getCurrentUsername()`: Detects logged-in user from multiple Twitter UI elements
- Searches through navigation, sidebars, and profile links
- Falls back to URL parsing if UI elements aren't available

**C. Tweet Parsing (Lines 36-52)**
- `getUsernameFromElement()`: Extracts username from tweet elements using `data-testid="User-Name"`
- `isOwnTweet()`: Compares tweet username with current username
- `findMoreButton()`: Locates Twitter's "more" menu button using `data-testid="caret"`

**D. Button Creation (Lines 54-72)**
- `createBlockButton()`: Creates the block button element
- Sets up click event listener with async error handling
- Stores username in dataset for reference

**E. Block Action Handler (Lines 74-111)**
- `handleBlockAction()`: Main blocking logic
  1. Finds and clicks Twitter's "more" button
  2. Waits for dropdown menu to appear
  3. Searches for the "Block @username" menu item
  4. Clicks the block option
  5. Waits for confirmation dialog
  6. Sets up MutationObserver to handle dialog closure
- `waitForDropdown()`: Polls for dropdown appearance (50ms intervals)
- `waitForConfirmationDialog()`: Polls for confirmation dialog (50ms intervals)

**F. Tweet Injection (Lines 141-169)**
- `injectBlockButtons()`: Main injection routine
  1. Queries all tweet elements using `data-testid="tweet"`
  2. Ensures current username is detected
  3. Skips already processed tweets
  4. Excludes own tweets
  5. Creates and inserts block button before "more" button

**G. Profile Page Support (Lines 183-251)**
- `injectProfileBlockButton()`: Special handling for profile pages
  1. Detects if current page is a user profile
  2. Excludes own profile page
  3. Finds user bio section using `data-testid="UserDescription"`
  4. Creates and appends block button to bio container
  5. Handles block action similar to tweets

**H. DOM Observation (Lines 171-181)**
- `observeNewTweets()`: Sets up MutationObserver on document body
  - Watches for childList and subtree changes
  - Triggers button injection when DOM updates
  - Handles Twitter's infinite scroll and dynamic content loading

**I. Initialization (Lines 253-265)**
- `init()`: Entry point that handles page load states
  1. Waits for DOMContentLoaded if page is loading
  2. Delays button injection (1s) to ensure Twitter UI is ready
  3. Delays observer setup (1.5s) to avoid early DOM mutations
  4. Supports both loading and loaded page states

#### 3. `styles.css`
- Defines `.fast-block-button` styling for tweet buttons
- Defines `.fast-profile-block-button` styling for profile buttons
- Matches Twitter's visual design language
- Handles button positioning and appearance

### Data Flow

```
Page Load
    ↓
init() called
    ↓
getCurrentUsername() - detects logged-in user
    ↓
injectBlockButtons() - processes existing tweets
injectProfileBlockButton() - if on profile page
    ↓
observeNewTweets() - sets up DOM watcher
    ↓
User clicks block button
    ↓
handleBlockAction()
    ↓
Click Twitter's more button → Wait for dropdown
    ↓
Find "Block @username" in dropdown → Click it
    ↓
Wait for confirmation dialog → User confirms
    ↓
MutationObserver detects dialog close → Cleanup
```

### Key Design Decisions

1. **Content Script Only**: No background scripts or service workers needed
2. **Event-Driven**: Uses MutationObserver for efficient DOM watching
3. **Deduplication**: Sets prevent processing same tweet multiple times
4. **Async/Await**: Handles asynchronous UI interactions cleanly
5. **Twitter Native Integration**: Uses Twitter's own UI elements rather than API calls
6. **Polling with Timeouts**: Simple approach for waiting on dynamic elements
7. **Graceful Degradation**: Multiple selectors for finding elements (Twitter's DOM changes often)

### Extension Lifecycle

1. **Loading**: `manifest.json` is parsed, content scripts are registered
2. **Initialization**: `init()` called, delays ensure Twitter UI is ready
3. **Active**: MutationObserver watches DOM changes, buttons injected dynamically
4. **Interaction**: User clicks buttons, async actions performed
5. **Cleanup**: Observers disconnected when no longer needed

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
