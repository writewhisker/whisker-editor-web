---
layout: home

hero:
  name: Whisker Language
  text: Write Interactive Fiction
  tagline: A clean, powerful language for branching narratives
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/writewhisker/whisker-editor-web

features:
  - icon: ✍️
    title: Simple Syntax
    details: Easy to learn, familiar to writers. Focus on your story, not the code.
  - icon: 🔀
    title: Powerful Branching
    details: Variables, conditions, data structures, and advanced flow control.
  - icon: 🌐
    title: Cross-Platform
    details: Run in browsers, games, and apps. Export to HTML, ePub, and more.
  - icon: 🔄
    title: Import & Export
    details: Import from Twine, Ink, and ChoiceScript. Export to multiple formats.
  - icon: ✅
    title: Smart Validation
    details: Catch errors early with comprehensive story validation.
  - icon: 📚
    title: Well Documented
    details: Complete tutorials, API reference, and examples library.
---

## Quick Example

```whisker
:: Start
Welcome to your adventure!
What would you like to do?

+ [Explore the forest] -> Forest
+ [Visit the village] -> Village

:: Forest
{do $courage = $courage + 1}
The forest is dark and mysterious.
{$courage > 2}
Your courage gives you strength!
{/}
+ [Go deeper] -> DeepForest
+ [Return] -> Start

:: Village
The village is peaceful.
+ [Talk to the elder] -> Elder
+ [Leave] -> Start
```

## Why Whisker?

- **For Writers**: Clean syntax that stays out of your way
- **For Developers**: TypeScript and Lua APIs for integration
- **For Publishers**: Export to web, mobile, and print formats
