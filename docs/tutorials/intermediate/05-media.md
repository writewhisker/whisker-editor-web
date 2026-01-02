# Adding Media

Enhance your stories with images, audio, and video.

## What You'll Learn

- Adding images to passages
- Background music and sound effects
- Video integration
- Media management best practices

## Prerequisites

- Completed [Styling](./04-styling)

## Images

Add images with Markdown syntax:

```whisker
:: Forest
![A misty forest path](images/forest.jpg)

You stand at the entrance to the ancient woods.
The path disappears into the mist ahead.
```

### Image Attributes

Control size and alignment:

```whisker
:: Gallery
![Small thumbnail](images/thumb.jpg){width=100}

![Medium image](images/scene.jpg){width=400}

![Full width](images/panorama.jpg){width=100%}

![Centered](images/hero.jpg){.centered}
```

### Background Images

Set passage backgrounds with CSS:

```whisker
@style: |
  .tag-forest {
    background-image: url('images/forest-bg.jpg');
    background-size: cover;
    background-position: center;
  }

  .tag-castle {
    background-image: url('images/castle-bg.jpg');
    background-size: cover;
  }

:: DeepForest [forest]
The trees tower above you...

:: Throne Room [castle]
The king awaits on his throne...
```

## Audio

### Background Music

```whisker
@audio: {
  music: {
    forest: "audio/forest-ambience.mp3",
    battle: "audio/battle-theme.mp3",
    town: "audio/peaceful-village.mp3"
  }
}

:: EnterForest
{playMusic("forest")}
The sounds of nature surround you.

:: StartBattle
{playMusic("battle", { fadeIn: 2 })}
Combat music swells as the enemy appears!

:: ReturnToTown
{playMusic("town", { crossfade: true })}
The familiar sounds of the village welcome you home.
```

### Sound Effects

```whisker
@audio: {
  sounds: {
    sword: "audio/sword-swing.mp3",
    door: "audio/door-creak.mp3",
    coin: "audio/coin-pickup.mp3",
    footsteps: "audio/footsteps.mp3"
  }
}

:: Attack
{playSound("sword")}
You swing your sword!

:: OpenDoor
{playSound("door")}
The ancient door groans open.

:: FindGold
{playSound("coin")}
{do $gold = $gold + 50}
You found 50 gold coins!
```

### Audio Controls

| Function | Description |
|----------|-------------|
| `playMusic(id)` | Start background music |
| `playMusic(id, {loop: false})` | Play once |
| `playMusic(id, {fadeIn: 2})` | Fade in over 2 seconds |
| `stopMusic()` | Stop current music |
| `stopMusic({fadeOut: 2})` | Fade out over 2 seconds |
| `playSound(id)` | Play a sound effect |
| `playSound(id, {volume: 0.5})` | Play at 50% volume |
| `setMusicVolume(0.7)` | Set music to 70% |
| `setSoundVolume(0.8)` | Set sounds to 80% |

## Video

Embed videos in your passages:

```whisker
:: Cutscene
<video width="100%" controls>
  <source src="video/intro.mp4" type="video/mp4">
  Your browser doesn't support video.
</video>

The adventure begins...

+ [Skip] -> Start
```

### Autoplay Video

```whisker
:: DramaticReveal
<video autoplay muted playsinline onended="document.getElementById('continue').style.display='block'">
  <source src="video/reveal.mp4" type="video/mp4">
</video>

<div id="continue" style="display:none">
+ [Continue] -> NextScene
</div>
```

## Asset Management

### Organizing Assets

Structure your project:

```
my-story/
├── story.ws
├── images/
│   ├── characters/
│   │   ├── hero.png
│   │   └── villain.png
│   ├── locations/
│   │   ├── forest.jpg
│   │   └── castle.jpg
│   └── items/
│       ├── sword.png
│       └── potion.png
├── audio/
│   ├── music/
│   │   ├── main-theme.mp3
│   │   └── battle.mp3
│   └── sounds/
│       ├── sword.mp3
│       └── door.mp3
└── video/
    └── intro.mp4
```

### Preloading Assets

Ensure smooth playback:

```whisker
@preload: {
  images: [
    "images/forest.jpg",
    "images/castle.jpg",
    "images/hero.png"
  ],
  audio: [
    "audio/music/main-theme.mp3",
    "audio/sounds/sword.mp3"
  ]
}
```

## Accessibility

### Image Alt Text

Always provide descriptive alt text:

```whisker
![A weathered stone bridge crosses a misty chasm](images/bridge.jpg)
```

### Audio Captions

Provide text alternatives:

```whisker
:: MysteriousSounds
{playSound("whisper")}

*You hear a faint whisper in the darkness...*

"Beware... the shadow..."
```

### Reduced Motion

Respect user preferences:

```whisker
@style: |
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
```

## Complete Example

```whisker
@title: The Haunted Manor
@theme: dark

@audio: {
  music: {
    spooky: "audio/spooky-ambience.mp3",
    tense: "audio/tense-music.mp3"
  },
  sounds: {
    creak: "audio/floor-creak.mp3",
    thunder: "audio/thunder.mp3",
    scream: "audio/distant-scream.mp3"
  }
}

@style: |
  .tag-manor {
    background-image: url('images/manor-interior.jpg');
    background-size: cover;
  }

:: Start
{playMusic("spooky", { fadeIn: 3 })}
{playSound("thunder")}

![Lightning illuminates an old manor](images/manor-exterior.jpg)

A flash of lightning reveals the manor looming before you.
Rain pounds against its ancient walls.

+ [Enter the manor] -> Entrance

:: Entrance [manor]
{playSound("creak")}

The door groans as you push it open.
Inside, dust motes drift through pale moonlight.

![A grand but decayed entrance hall](images/entrance-hall.jpg)

A grand staircase leads upward.
Doors flank you on either side.

+ [Climb the stairs] -> Upstairs
+ [Try the left door] -> LeftRoom
+ [Try the right door] -> RightRoom

:: LeftRoom [manor]
{playMusic("tense", { crossfade: true })}
{playSound("scream")}

You enter what was once a library.
Books line the walls, their pages yellowed with age.

![Dusty bookshelves in an abandoned library](images/library.jpg)

A distant scream echoes through the manor.

+ [Investigate] -> SecretPassage
+ [Return to entrance] -> Entrance
```

## Optimization Tips

1. **Compress images** - Use WebP format when possible
2. **Optimize audio** - Use MP3 at 128kbps for music, lower for effects
3. **Lazy load** - Only load assets when needed
4. **Provide fallbacks** - Support older browsers

## Try It Yourself

Create a short story with:

1. **At least 3 images** for different scenes
2. **Background music** that changes between areas
3. **Sound effects** for player actions
4. **Proper accessibility** with alt text and captions

## What's Next?

Congratulations! You've completed the intermediate tutorials!

You now know how to:
- Use advanced flow control with gathers and tunnels
- Work with data structures
- Create functions and namespaces
- Style your stories professionally
- Add multimedia content

Ready for more? Check out:
- [Advanced Examples](/examples/advanced/) - Complex implementations
- [API Reference](/api/) - Technical documentation
- [Migration Guides](/migration/) - Import from other formats
