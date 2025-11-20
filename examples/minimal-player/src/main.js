import './style.css';
import { Story } from '@writewhisker/core-ts';
import { WhiskerPlayerUI } from '@writewhisker/player-ui';

// Load story from URL parameter or use demo
const params = new URLSearchParams(window.location.search);
const storyUrl = params.get('story');

async function loadStory() {
  let story;

  if (storyUrl) {
    try {
      const response = await fetch(storyUrl);
      const storyData = await response.json();
      story = Story.deserialize(storyData);
    } catch (err) {
      console.error('Failed to load story:', err);
      showError('Failed to load story from URL');
      return;
    }
  } else {
    // Create demo story
    story = createDemoStory();
  }

  // Initialize player
  try {
    const player = new WhiskerPlayerUI('#player', story, {
      theme: 'dark',
      showToolbar: true,
      autoSave: true,
      saveKey: 'whisker-minimal-player-save',
      onPassageChange: (passage) => {
        console.log('Entered passage:', passage.name);
      },
      onComplete: () => {
        console.log('Story completed!');
      },
    });

    console.log('Player initialized successfully');
  } catch (err) {
    console.error('Failed to initialize player:', err);
    showError('Failed to initialize player');
  }
}

function createDemoStory() {
  const story = new Story({
    metadata: {
      title: 'The Lost Key',
      author: 'Whisker Team',
      description: 'A short interactive mystery',
    },
  });

  // Start passage
  const start = story.createPassage({
    name: 'Start',
    title: 'The Lost Key',
    content: `You wake up in a dimly lit room. The last thing you remember is...nothing. Your memory is blank.

A single door stands before you, locked. There's a note on the floor.

[[Read the note->Note]]
[[Try the door->LockedDoor]]`,
    tags: ['start'],
  });

  // Note passage
  const note = story.createPassage({
    name: 'Note',
    title: 'The Note',
    content: `The note reads:

"The key is where shadows dance and light refuses to go."

Cryptic. You look around the room more carefully.

[[Examine the corners->Corners]]
[[Check under furniture->Furniture]]
[[Back to the door->LockedDoor]]`,
  });

  // Corners passage
  const corners = story.createPassage({
    name: 'Corners',
    title: 'Dark Corners',
    content: `You search the dark corners of the room. In the darkest corner, behind a stack of boxes, your fingers brush against something cold and metallic.

It's a key!

[[Use the key on the door->UnlockDoor]]`,
  });

  // Furniture passage
  const furniture = story.createPassage({
    name: 'Furniture',
    title: 'Under the Furniture',
    content: `You check under the bed and table, but find nothing but dust and cobwebs.

The note said "where shadows dance"...maybe you should look elsewhere.

[[Check the corners->Corners]]
[[Try the door anyway->LockedDoor]]`,
  });

  // Locked door passage
  const lockedDoor = story.createPassage({
    name: 'LockedDoor',
    title: 'The Locked Door',
    content: `You try the door handle. It's locked tight. You'll need to find the key.

[[Search the room->Note]]`,
  });

  // Unlock door passage
  const unlockDoor = story.createPassage({
    name: 'UnlockDoor',
    title: 'Freedom',
    content: `The key slides into the lock with a satisfying click. You turn it, and the door swings open.

Bright light floods the room. You step through into...

[[Continue->Ending]]`,
  });

  // Ending passage
  const ending = story.createPassage({
    name: 'Ending',
    title: 'The End',
    content: `...freedom.

You're outside. The sun is shining. Birds are singing. You have no idea where you are or how you got here, but at least you're out of that room.

Your journey continues...

**THE END**

Thanks for playing this demo!`,
  });

  return story;
}

function showError(message) {
  const container = document.getElementById('player');
  container.innerHTML = `
    <div class="error">
      <h2>Error</h2>
      <p>${message}</p>
      <button onclick="window.location.reload()">Reload</button>
    </div>
  `;
}

// Start the application
loadStory();
