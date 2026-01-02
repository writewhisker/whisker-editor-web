# Styling Your Stories

Customize the appearance of your stories with themes and CSS.

## What You'll Learn

- Using built-in themes
- Custom CSS styling
- Passage-specific styles
- Dynamic theming

## Prerequisites

- Completed [Functions](./03-functions)

## Built-in Themes

Whisker includes several pre-built themes:

```whisker
@theme: dark
```

### Available Themes

| Theme | Description |
|-------|-------------|
| `light` | Clean white background (default) |
| `dark` | Dark mode with light text |
| `sepia` | Warm, paper-like appearance |
| `high-contrast` | Maximum accessibility |
| `terminal` | Retro computer terminal look |

### Applying Themes

Set the theme in your story header:

```whisker
@title: My Story
@author: Your Name
@theme: dark

:: Start
The story begins...
```

## Custom CSS

Add custom styles with the `@style` directive:

```whisker
@style: |
  body {
    font-family: 'Georgia', serif;
    line-height: 1.8;
  }

  .passage {
    max-width: 700px;
    margin: 0 auto;
  }

  .choice {
    padding: 10px 20px;
    margin: 5px 0;
    background: #f0f0f0;
    border-radius: 5px;
  }

  .choice:hover {
    background: #e0e0e0;
  }
```

### CSS Classes

| Class | Element |
|-------|---------|
| `.passage` | The current passage container |
| `.passage-title` | Passage title (if shown) |
| `.passage-content` | The main text content |
| `.choice` | Individual choice buttons |
| `.choice-text` | Text inside choices |
| `.variable` | Interpolated variables |

## Passage Tags and Styling

Tag passages to apply specific styles:

```whisker
@style: |
  .tag-combat {
    background: #ff4444;
    color: white;
  }

  .tag-peaceful {
    background: #44ff44;
    color: #003300;
  }

  .tag-dream {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-style: italic;
  }

:: BattleScene [combat]
You face the dragon!

:: Village [peaceful]
The village is calm and welcoming.

:: DreamSequence [dream]
Colors swirl around you as you drift through the dream...
```

## Inline Styling

Apply styles directly in content:

```whisker
:: Introduction
<span style="color: red">Warning!</span> Danger ahead.

<div class="important">
This message is important.
</div>

<em>The wizard whispers:</em> "Beware the shadow..."
```

## Markdown Styling

Whisker supports Markdown formatting:

```whisker
:: FormattedContent
# Main Heading

This is **bold** and this is *italic*.

> A blockquote for important dialogue.

- Item one
- Item two
- Item three

---

`Code` looks like this.

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

## Dynamic Theming

Let players choose their preferred theme:

```whisker
:: Settings
Choose your theme:

+ [Light mode] {do $theme = "light"} -> ApplyTheme
+ [Dark mode] {do $theme = "dark"} -> ApplyTheme
+ [Sepia] {do $theme = "sepia"} -> ApplyTheme
+ [Back] -> Menu

:: ApplyTheme
{setTheme($theme)}
Theme changed to $theme mode.
+ [Back to settings] -> Settings
```

## Responsive Design

Make your story look good on all devices:

```whisker
@style: |
  /* Base styles */
  .passage {
    padding: 20px;
  }

  /* Mobile styles */
  @media (max-width: 600px) {
    .passage {
      padding: 10px;
      font-size: 16px;
    }

    .choice {
      width: 100%;
      padding: 15px;
    }
  }

  /* Tablet styles */
  @media (min-width: 601px) and (max-width: 1024px) {
    .passage {
      padding: 30px;
      max-width: 600px;
    }
  }

  /* Desktop styles */
  @media (min-width: 1025px) {
    .passage {
      padding: 40px;
      max-width: 800px;
    }
  }
```

## Animations

Add subtle animations:

```whisker
@style: |
  .passage {
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .choice {
    transition: all 0.2s ease;
  }

  .choice:hover {
    transform: translateX(5px);
  }
```

## Complete Theme Example

```whisker
@title: Dark Fantasy
@author: Your Name
@theme: dark

@style: |
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');

  body {
    font-family: 'Georgia', serif;
    background: linear-gradient(to bottom, #1a1a2e, #16213e);
    color: #eee;
  }

  .passage {
    max-width: 700px;
    margin: 0 auto;
    padding: 40px;
    background: rgba(0,0,0,0.5);
    border: 1px solid #333;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  h1, h2, h3 {
    font-family: 'Cinzel', serif;
    color: #d4af37;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .choice {
    display: block;
    padding: 15px 25px;
    margin: 10px 0;
    background: rgba(212, 175, 55, 0.2);
    border: 1px solid #d4af37;
    border-radius: 5px;
    color: #d4af37;
    text-decoration: none;
    transition: all 0.3s ease;
  }

  .choice:hover {
    background: #d4af37;
    color: #1a1a2e;
    transform: scale(1.02);
  }

  .tag-danger {
    border-color: #ff4444;
  }

  .tag-danger .choice {
    border-color: #ff4444;
    color: #ff4444;
  }
```

## Try It Yourself

Create a styled story with:

1. **A custom theme** with your preferred colors
2. **Tag-based styling** for different scene types
3. **Responsive design** that works on mobile
4. **At least one animation**

## Next Steps

Add media to your stories:

[Adding Media →](./05-media)
