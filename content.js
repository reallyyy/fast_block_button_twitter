let currentUsername = '';
let processedTweets = new Set();
let processedProfiles = new Set();

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
          currentUsername = match[1];
          if (currentUsername && !currentUsername.includes('.')) {
            return;
          }
        }
      }
    }
  }
  
  const profileUrl = window.location.pathname;
  if (profileUrl.startsWith('/') && profileUrl.split('/').filter(Boolean).length === 1) {
    currentUsername = profileUrl.replace('/', '').replace('/', '');
  }
}

function getUsernameFromElement(element) {
  const nameElement = element.querySelector('[data-testid="User-Name"]');
  if (nameElement) {
    const usernameSpan = Array.from(nameElement.querySelectorAll('span')).find(span => span.textContent.startsWith('@'));
    return usernameSpan ? usernameSpan.textContent.replace('@', '') : '';
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

function createBlockButton(username, tweetElement) {
  const button = document.createElement('button');
  button.className = 'fast-block-button';
  button.textContent = '👋';
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
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  
  if (!currentUsername) {
    getCurrentUsername();
  }
  
  tweets.forEach((tweet) => {
    const tweetKey = tweet.outerHTML.substring(0, 100);
    if (processedTweets.has(tweetKey)) return;
    
    const mainUsername = getUsernameFromElement(tweet);
    
    if (isOwnTweet(tweet)) {
      processedTweets.add(tweetKey);
      return;
    }
    
    if (mainUsername) {
      const moreButton = findMoreButton(tweet);
      if (moreButton && !tweet.querySelector('.fast-block-button')) {
        const blockButton = createBlockButton(mainUsername, tweet);
        moreButton.parentElement.insertBefore(blockButton, moreButton);
      }
    }
    
    processedTweets.add(tweetKey);
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
  if (!isProfilePage) return;

  if (!currentUsername) {
    getCurrentUsername();
  }

  const profileUsername = window.location.pathname.replace('/', '');
  if (profileUsername === currentUsername) return;

  const bioElement = document.querySelector('[data-testid="UserDescription"]');
  if (bioElement && !bioElement.parentElement.querySelector('.fast-profile-block-button')) {
    const button = document.createElement('button');
    button.className = 'fast-profile-block-button';
    button.textContent = '👋';
    button.dataset.username = profileUsername;
    button.style.display = 'block';
    button.style.marginTop = '12px';

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const moreButton = document.querySelector('[data-testid="userActions"]') || document.querySelector('[data-testid="caret"]');
        if (!moreButton) {
          console.error('Could not find more button for profile');
          return;
        }

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

    bioElement.parentElement.appendChild(button);
  }
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(injectBlockButtons, 1000);
      setTimeout(injectProfileBlockButton, 1000);
      setTimeout(observeNewTweets, 1500);
    });
  } else {
    setTimeout(injectBlockButtons, 1000);
    setTimeout(injectProfileBlockButton, 1000);
    setTimeout(observeNewTweets, 1500);
  }
}

init();
