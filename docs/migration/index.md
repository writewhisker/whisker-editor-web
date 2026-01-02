# Migration Guides

Coming from another interactive fiction tool? We've got you covered.

## Available Guides

### [From Twine](/migration/from-twine)
Migrate from Twine's Harlowe or SugarCube formats.
- Syntax comparison tables
- Macro equivalents
- Automated import tool

### [From Ink](/migration/from-ink)
Migrate from Inkle's Ink format.
- Knot/stitch to passage mapping
- Divert syntax conversion
- Tunnel/gather equivalents

### [From ChoiceScript](/migration/from-choicescript)
Migrate from Choice of Games' ChoiceScript.
- Scene to passage mapping
- Stat/variable conversion
- Conditional syntax

## Automated Import

Whisker can automatically convert many stories:

```bash
# From Twine HTML export
whisker import story.html --from=twine -o story.ws

# From Ink source
whisker import story.ink --from=ink -o story.ws

# From ChoiceScript
whisker import startup.txt --from=choicescript -o story.ws
```

## What Converts Automatically

| Feature | Twine | Ink | ChoiceScript |
|---------|-------|-----|--------------|
| Passages/Scenes | ✅ | ✅ | ✅ |
| Choices | ✅ | ✅ | ✅ |
| Variables | ✅ | ✅ | ✅ |
| Conditions | ✅ | ✅ | ✅ |
| Basic Formatting | ✅ | ✅ | ✅ |
| Custom Macros | ⚠️ | ⚠️ | ⚠️ |
| Complex Logic | ⚠️ | ⚠️ | ⚠️ |

✅ Full support | ⚠️ Partial/manual review needed

## After Import

Always review your imported story:

1. **Validate**: `whisker validate story.ws`
2. **Test**: Play through key paths
3. **Refine**: Take advantage of WLS-specific features

## Need Help?

- Check the format-specific guides for detailed conversion tables
- Join our [Discord](https://discord.gg/whisker) for migration support
- Report import issues on [GitHub](https://github.com/writewhisker/whisker-editor-web/issues)
