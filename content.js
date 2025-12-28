let currentUsername = '';
let processedTweets = new Set();
let lastInjectionTime = 0;
let injectionThrottle = 100;

const DEBUG = false;

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
      }
    }
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

function findCommonAncestor(element1, element2) {
  if (!element1 || !element2) {
    return element1 || element2?.parentElement;
  }

  const ancestors1 = new Set();
  let current = element1;

  while (current) {
    ancestors1.add(current);
    current = current.parentElement;
  }

  current = element2;
  while (current) {
    if (ancestors1.has(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function findActionContainer(button) {
  let current = button.parentElement;
  
  while (current && current.tagName === 'DIV') {
    const childDivs = Array.from(current.children).filter(child => child.tagName === 'DIV');
    
    if (childDivs.length >= 2) {
      const hasButtons = childDivs.some(div => {
        const buttons = div.querySelectorAll('button');
        return buttons.length > 0;
      });
      
      if (hasButtons) {
        return current;
      }
    }
    
    current = current.parentElement;
  }
  
  return button.parentElement;
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
  
  tweets.forEach((tweet) => {
    const tweetId = getTweetId(tweet);
    const tweetKey = tweetId || tweet.outerHTML.substring(0, 200);
    
    if (processedTweets.has(tweetKey)) {
      const hasButton = tweet.querySelector('.fast-block-button');
      if (hasButton) {
        return;
      } else {
        processedTweets.delete(tweetKey);
      }
    }
    
    const mainUsername = getUsernameFromElement(tweet);
    
    if (!mainUsername) {
      processedTweets.add(tweetKey);
      return;
    }
    
    if (isOwnTweet(tweet)) {
      processedTweets.add(tweetKey);
      return;
    }
    
    const moreButton = findMoreButton(tweet);
    if (!moreButton) {
      return;
    }
    
    if (tweet.querySelector('.fast-block-button')) {
      processedTweets.add(tweetKey);
      return;
    }
    
    const blockButton = createBlockButton(mainUsername, tweet, moreButton);

    try {
      const grokButton = tweet.querySelector('[aria-label="Grok actions"]');

      const moreInnerWrapper = moreButton.parentElement;
      if (!moreInnerWrapper) {
        return;
      }

      let targetElementWrapper;
      let insertionContainer;
      let insertBeforeWrapper;

      if (grokButton) {
        targetElementWrapper = grokButton.parentElement;
        insertionContainer = findActionContainer(grokButton);
        insertBeforeWrapper = targetElementWrapper;
      } else {
        targetElementWrapper = moreInnerWrapper;
        insertionContainer = findActionContainer(moreButton);
        insertBeforeWrapper = targetElementWrapper;
      }

      if (!targetElementWrapper || !insertionContainer) {
        return;
      }

      const buttonWrapper = targetElementWrapper.cloneNode(false);
      buttonWrapper.appendChild(blockButton);

      insertionContainer.insertBefore(buttonWrapper, insertBeforeWrapper);
      processedTweets.add(tweetKey);
    } catch (error) {
      console.error('Error injecting block button for tweet:', tweetKey, error);
      return;
    }
  });
}

function observeNewTweets() {
  const throttledInject = () => {
    const now = performance.now();
    if (now - lastInjectionTime < injectionThrottle) {
      return;
    }
    
    lastInjectionTime = now;
    injectBlockButtons();
  };
  
  const observer = new MutationObserver((mutations) => {
    throttledInject();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function init() {
  const runInit = () => {
    observeNewTweets();
    injectBlockButtons();
    setTimeout(injectBlockButtons, 1000);
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
