let currentUsername = '';
let processedTweets = new Set();
let processedProfiles = new Set();

const DEBUG = false;

function debugLog(...args) {
  if (DEBUG) {
    console.log('[FastBlock]', ...args);
  }
}

function getCurrentUsername() {
  const selectors = [
    '[data-testid="UserCell"] a[role="link"]',
    '[data-testid="SideNav_AccountSwitcher_Button"] a[role="link"]',
    '[data-testid="AppTabBar_Profile_Link"]',
    'nav a[href*="/"]',
    '[data-testid="UserDescription"] a[href*="/"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const href = element.getAttribute('href');
      if (href) {
        const match = href.match(/\/([^\/]+)\/?$/);
        if (match) {
          const username = match[1];
          if (username && !username.includes('.')) {
            currentUsername = username;
            debugLog(`Detected current username: ${currentUsername} from selector: ${selector}`);
            return;
          }
        }
      }
    }
  }
  
  const profileUrl = window.location.pathname;
  if (profileUrl.startsWith('/') && profileUrl.split('/').filter(Boolean).length === 1) {
    const username = profileUrl.replace('/', '').replace('/', '');
    if (username) {
      currentUsername = username;
      debugLog(`Detected current username from URL: ${currentUsername}`);
    }
  }
  
  debugLog(`Could not detect current username, value: ${currentUsername}`);
}

function getTweetId(element) {
  const tweetLink = element.querySelector('a[href*="/status/"]');
  if (tweetLink) {
    const match = tweetLink.getAttribute('href').match(/\/status\/(\d+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function getUsernameFromElement(element) {
  const nameElement = element.querySelector('[data-testid="User-Name"]');
  if (nameElement) {
    const usernameSpan = Array.from(nameElement.querySelectorAll('span')).find(span => span.textContent.startsWith('@'));
    if (usernameSpan) {
      return usernameSpan.textContent.replace('@', '');
    }
    
    const usernameLink = nameElement.querySelector('a[href^="/"]');
    if (usernameLink) {
      const href = usernameLink.getAttribute('href');
      if (href && href.startsWith('/')) {
        return href.substring(1);
      }
    }
  }
  return '';
}

function isOwnTweet(tweetElement) {
  const username = getUsernameFromElement(tweetElement);
  return username === currentUsername;
}

function findMoreButton(tweetElement) {
  return tweetElement.querySelector('[data-testid="caret"]');
}

function createBlockButton(username, tweetElement, moreButton) {
  const button = moreButton.cloneNode(true);
  
  button.removeAttribute('data-testid');
  button.removeAttribute('aria-label');
  button.removeAttribute('aria-expanded');
  button.removeAttribute('aria-haspopup');
  
  button.classList.add('fast-block-button');
  
  const div = button.querySelector('div[dir="ltr"]');
  if (div) {
    const svg = div.querySelector('svg');
    if (svg) {
      svg.remove();
    }
    const existingSpan = div.querySelector('span');
    if (existingSpan) {
      existingSpan.textContent = '👋';
    } else {
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = '👋';
      div.insertBefore(emojiSpan, div.firstChild);
    }
  }
  
  button.dataset.username = username;
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await handleBlockAction(tweetElement, button, username);
    } catch (error) {
      console.error('Block action failed:', error);
    }
  });
  
  return button;
}

async function handleBlockAction(tweetElement, button, username) {
  const moreButton = findMoreButton(tweetElement);
  if (!moreButton) {
    console.error('Could not find more button for:', username);
    return;
  }
  
  moreButton.click();
  
  const dropdown = await waitForDropdown();
  
  const dropdownItems = dropdown.querySelectorAll('[role="menuitem"]');
  for (const item of dropdownItems) {
    if (item.textContent.includes('Block') && 
        item.textContent.includes(`@${username}`)) {
      item.click();
      break;
    }
  }
  
  await waitForConfirmationDialog();
  
  const observer = new MutationObserver((mutations) => {
    const dialog = document.querySelector('[data-testid="confirmationSheetDialog"]');
    if (!dialog) {
      const currentDropdown = document.querySelector('[role="menu"]');
      if (currentDropdown) {
        moreButton.click();
      }
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function waitForDropdown() {
  return new Promise((resolve) => {
    const checkDropdown = () => {
      const dropdown = document.querySelector('[role="menu"]');
      if (dropdown) {
        resolve(dropdown);
      } else {
        setTimeout(checkDropdown, 50);
      }
    };
    checkDropdown();
  });
}

function waitForConfirmationDialog() {
  return new Promise((resolve) => {
    const checkDialog = () => {
      const dialog = document.querySelector('[data-testid="confirmationSheetDialog"]');
      if (dialog) {
        resolve();
      } else {
        setTimeout(checkDialog, 50);
      }
    };
    checkDialog();
  });
}

function injectBlockButtons() {
  const primarySelector = '[data-testid="tweet"]';
  const fallbackSelectors = [
    'article[data-testid="tweet"]',
    'div[role="article"]',
    '[data-testid="tweet"]'
  ];
  
  let tweets = [];
  for (const selector of fallbackSelectors) {
    const found = Array.from(document.querySelectorAll(selector));
    tweets = tweets.concat(found);
    if (tweets.length > 0) {
      break;
    }
  }
  
  tweets = [...new Set(tweets)];
  
  if (!currentUsername) {
    getCurrentUsername();
  }
  
  debugLog(`Found ${tweets.length} tweets, currentUsername: ${currentUsername}`);
  
  tweets.forEach((tweet) => {
    const tweetId = getTweetId(tweet);
    const tweetKey = tweetId || tweet.outerHTML.substring(0, 200);
    
    if (processedTweets.has(tweetKey)) {
      const hasButton = tweet.querySelector('.fast-block-button');
      if (hasButton) {
        debugLog(`Skipping already processed tweet with button: ${tweetKey}`);
        return;
      } else {
        debugLog(`Tweet in processedTweets but button missing (likely recycled), reprocessing: ${tweetKey}`);
        processedTweets.delete(tweetKey);
      }
    }
    
    const mainUsername = getUsernameFromElement(tweet);
    
    if (!mainUsername) {
      debugLog(`Could not extract username for tweet: ${tweetKey}`);
      processedTweets.add(tweetKey);
      return;
    }
    
    if (isOwnTweet(tweet)) {
      debugLog(`Skipping own tweet: ${mainUsername}`);
      processedTweets.add(tweetKey);
      return;
    }
    
    const moreButton = findMoreButton(tweet);
    if (!moreButton) {
      debugLog(`Could not find more button for tweet: ${tweetKey} - will retry`);
      return;
    }
    
    if (tweet.querySelector('.fast-block-button')) {
      debugLog(`Tweet already has fast block button: ${tweetKey}`);
      processedTweets.add(tweetKey);
      return;
    }
    
    debugLog(`Injecting block button for @${mainUsername}`);
    const blockButton = createBlockButton(mainUsername, tweet, moreButton);

    try {
      const moreInnerWrapper = moreButton.parentElement;
      debugLog(`More inner wrapper:`, moreInnerWrapper?.className?.substring(0, 50));

      if (!moreInnerWrapper) {
        debugLog(`Could not find moreInnerWrapper, skipping tweet: ${tweetKey}`);
        return;
      }

      const grokButton = tweet.querySelector('[aria-label="Grok actions"]');
      debugLog(`Grok button exists in tweet:`, !!grokButton);

      let insertBeforeElement = null;

      if (grokButton) {
        insertBeforeElement = grokButton.parentElement;
        debugLog(`Will insert before Grok button's parent`);
      } else {
        insertBeforeElement = moreInnerWrapper;
        debugLog(`Grok not found, will insert before More button's parent`);
      }

      const buttonWrapper = moreInnerWrapper.cloneNode(false);
      buttonWrapper.appendChild(blockButton);
      debugLog(`Created button wrapper with className:`, buttonWrapper.className.substring(0, 50));

      const parentContainer = insertBeforeElement.parentElement;
      debugLog(`Parent container for insertion:`, parentContainer?.className?.substring(0, 50));

      if (!parentContainer) {
        debugLog(`Could not find parent container, skipping tweet: ${tweetKey}`);
        return;
      }

      parentContainer.insertBefore(buttonWrapper, insertBeforeElement);
      debugLog(`Successfully injected block button for @${mainUsername}`);
      processedTweets.add(tweetKey);
    } catch (error) {
      console.error('Error injecting block button for tweet:', tweetKey, error);
      debugLog(`Error injecting block button: ${error.message}`);
      return;
    }
  });
}

function observeNewTweets() {
  const observer = new MutationObserver((mutations) => {
    injectBlockButtons();
    injectProfileBlockButton();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectProfileBlockButton() {
  const isProfilePage = /^\/[^\/]+$/.test(window.location.pathname);
  debugLog('injectProfileBlockButton - isProfilePage:', isProfilePage, 'pathname:', window.location.pathname);
  if (!isProfilePage) return;

  if (!currentUsername) {
    getCurrentUsername();
  }

  const profileUsername = window.location.pathname.replace('/', '');
  debugLog('profileUsername:', profileUsername, 'currentUsername:', currentUsername);
  if (profileUsername === currentUsername) {
    debugLog('Skipping own profile page');
    return;
  }

  const moreButton = document.querySelector('[data-testid="userActions"]');
  debugLog('moreButton found:', !!moreButton);
  if (moreButton && !moreButton.parentElement.querySelector('.fast-block-button')) {
    debugLog('Creating profile block button');
    const button = moreButton.cloneNode(true);
    
    button.removeAttribute('data-testid');
    button.removeAttribute('aria-label');
    button.removeAttribute('aria-describedby');
    button.removeAttribute('aria-expanded');
    button.removeAttribute('aria-haspopup');
    
    button.classList.add('fast-block-button');
    
    const div = button.querySelector('div[dir="ltr"]');
    debugLog('div found:', !!div);
    if (div) {
      const svg = div.querySelector('svg');
      debugLog('svg found:', !!svg);
      if (svg) {
        svg.remove();
      }
      const existingSpan = div.querySelector('span');
      debugLog('span found:', !!existingSpan);
      if (existingSpan) {
        existingSpan.textContent = '👋';
      } else {
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '👋';
        div.insertBefore(emojiSpan, div.firstChild);
      }
    }
    
    button.dataset.username = profileUsername;

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        moreButton.click();
        
        const dropdown = await waitForDropdown();
        
        const dropdownItems = dropdown.querySelectorAll('[role="menuitem"]');
        for (const item of dropdownItems) {
          if (item.textContent.includes('Block') && 
              item.textContent.includes(`@${profileUsername}`)) {
            item.click();
            break;
          }
        }

        await waitForConfirmationDialog();

        const observer = new MutationObserver((mutations) => {
          const dialog = document.querySelector('[data-testid="confirmationSheetDialog"]');
          if (!dialog) {
            const currentDropdown = document.querySelector('[role="menu"]');
            if (currentDropdown) {
              moreButton.click();
            }
            observer.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      } catch (error) {
        console.error('Profile block action failed:', error);
      }
    });

    const buttonWrapper = moreButton.parentElement.cloneNode(false);
    buttonWrapper.className = moreButton.parentElement.className;
    buttonWrapper.appendChild(button);
    moreButton.parentElement.parentElement.insertBefore(buttonWrapper, moreButton.parentElement);
    debugLog('Button inserted');
  }
}

function init() {
  const runInit = () => {
    observeNewTweets();
    injectBlockButtons();
    setTimeout(injectProfileBlockButton, 500);
    setTimeout(injectBlockButtons, 1000);
    setTimeout(injectProfileBlockButton, 1500);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runInit, 1000);
    });
  } else {
    setTimeout(runInit, 1000);
  }
}

init();
