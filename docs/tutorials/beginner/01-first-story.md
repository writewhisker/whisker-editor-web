# Your First Whisker Story

Learn to create a simple interactive story in Whisker.

## What You'll Learn

- Creating a story file
- Writing your first passage
- Running your story in the browser

## Prerequisites

- Access to the [Whisker Web Editor](https://whisker.dev) or a text editor
- About 10 minutes of time

## Step 1: Create a Story File

Open the Whisker editor or create a new file called `hello.ws`.

Every Whisker story is made up of **passages** - chunks of text that readers navigate between.

```whisker
:: Start
Welcome to your first Whisker story!

This is the beginning of your adventure.
```

## Understanding the Syntax

Let's break down what we just wrote:

| Element | Meaning |
|---------|---------|
| `::` | Marks the start of a passage |
| `Start` | The name of the passage |
| Text below | The content readers will see |

::: tip Important
Every story must have a passage named `Start`. This is where your story begins!
:::

## Step 2: Add More Content

Let's add some descriptive text:

```whisker
:: Start
Welcome to your first Whisker story!

You find yourself standing at the edge of a misty forest.
The trees stretch endlessly before you, their leaves rustling
in an unseen wind.

What will you do?
```

## Step 3: Run Your Story

### In the Web Editor

1. Paste your story into the editor
2. Click the **Play** button
3. See your story appear in the preview panel

### With the CLI

If you're using the command line:

```bash
whisker play hello.ws
```

## What You've Created

Congratulations! You've created a complete (if simple) Whisker story. It has:

- **One passage** named "Start"
- **Text content** that displays to the reader
- **A beginning** that the player can read

Of course, a story with just text isn't very interactive. In the next tutorial, we'll add choices so readers can shape the story.

## Try It Yourself

Before moving on, try these exercises:

1. **Change the text**: Write your own opening scene
2. **Add paragraphs**: Use blank lines to create paragraph breaks
3. **Experiment**: What happens if you rename "Start" to something else?

::: warning About the Start Passage
If you rename the "Start" passage, you'll get an error! Every Whisker story needs a "Start" passage as its entry point.
:::

## Complete Example

Here's a slightly more elaborate first passage:

```whisker
:: Start
# The Forest Path

You stand at the edge of the Whispering Woods.

Legend says that those who enter never return the same.
Some say they find treasure beyond imagination.
Others speak of creatures that lurk in the shadows.

The morning sun filters through the canopy above,
casting dappled light on the path before you.

A small signpost reads: "Enter at your own risk."
```

## Next Steps

Ready to make your story interactive? Continue to the next tutorial:

[Adding Choices →](./02-adding-choices)
