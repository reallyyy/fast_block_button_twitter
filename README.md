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
