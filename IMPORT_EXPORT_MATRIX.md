# Import/Export Capabilities Matrix

**Last Updated:** November 19, 2025
**Version:** 1.0
**Related Packages:** @writewhisker/import, @writewhisker/export

---

## Executive Summary

This document provides a comprehensive reference for all import and export capabilities in the Whisker Editor ecosystem. Use this matrix to understand format support, limitations, and recommended workflows.

**Quick Stats:**
- **Import Formats:** 2 fully supported (JSON, Twine 2)
- **Export Formats:** 6 fully supported (JSON, HTML, Markdown, Twine 2, EPUB, Static Site)
- **HTML Themes:** 10 built-in themes
- **Test Coverage:** 234 tests (105 import + 129 export)

---

## Import Support

| Format | Status | Package | Extensions | Limitations | Notes |
|--------|--------|---------|------------|-------------|-------|
| **Whisker JSON v1.0-2.1** | ✅ Full | @writewhisker/import | `.json` | None | Native format, lossless |
| **Twine 2 HTML** | ⚠️ Good | @writewhisker/import | `.html` | Macro conversion varies by format | See Twine details below |
| **Twine 1.x Legacy** | ❌ Not Supported | - | - | Use Twine 2 to migrate first | Legacy format |
| **Ink** | ❌ Not Supported | - | `.ink` | Future consideration | Low priority |
| **Yarn Spinner** | ❌ Not Supported | - | `.yarn` | Future consideration | Low priority |
| **ChoiceScript** | ❌ Not Supported | - | `.txt` | Future consideration | Low priority |
| **Twee Notation** | ⚠️ Experimental | @writewhisker/import | `.twee`, `.tw` | Via Twine importer | Plain text format |

### Import Features

**JSONImporter Features:**
- ✅ Auto-detection of Whisker format versions (1.0-2.1)
- ✅ Validation during import
- ✅ Metadata preservation
- ✅ Variable and tag import
- ✅ Error recovery
- ✅ Format migration (old → new)

**TwineImporter Features:**
- ✅ HTML parsing and passage extraction
- ✅ Link detection and conversion
- ✅ Tag import
- ✅ Position/size preservation
- ⚠️ Macro conversion (format-dependent)
- ⚠️ Variable conversion (basic support)
- ✅ Conversion quality reporting

---

## Export Support

| Format | Status | Package | Extension | Features | Use Case |
|--------|--------|---------|-----------|----------|----------|
| **Whisker JSON** | ✅ Full | @writewhisker/export | `.json` | Complete story data | Backup, sharing, version control |
| **HTML Standalone** | ✅ Full | @writewhisker/export | `.html` | Embedded runtime, 10 themes, minification | Web hosting, distribution |
| **Markdown** | ✅ Full | @writewhisker/export | `.md` | Human-readable, metrics, validation | Documentation, review |
| **Twine 2 HTML** | ✅ Full | @writewhisker/export | `.html` | Harlowe 3.x compatible | Import to Twine 2 |
| **EPUB 3.0** | ✅ Full | @writewhisker/export | `.epub` | E-reader compatible, images, styling | E-book distribution |
| **Static Site** | ✅ Full | @writewhisker/export | `.html` | Multi-page site with navigation | Web publishing |
| **PDF** | ❌ Not Supported | - | `.pdf` | Future consideration | Phase 4+ |
| **Mobile App** | ❌ Not Supported | - | - | Requires Capacitor | Out of scope |
| **Desktop App** | ❌ Not Supported | - | - | Requires Tauri | Out of scope |

### Export Features by Format

#### JSON Export (WhiskerCoreExporter)
- ✅ Complete story serialization
- ✅ Metadata preservation
- ✅ Validation status included
- ✅ Version information
- ✅ Export timestamp
- ✅ Round-trip compatibility (import ↔ export)
- ✅ v2.1 format support with EditorData preservation
- ✅ Lua functions export
- ✅ Asset references export

#### HTML Export (HTMLExporter)
- ✅ Embedded story player
- ✅ 10 built-in themes (see theme list below)
- ✅ Custom CSS/JS injection
- ✅ HTML minification option
- ✅ Responsive design
- ✅ No external dependencies
- ✅ Works offline
- ✅ Lua scripting support (via Fengari runtime)
- ✅ Player features: undo/redo, save/load, auto-save, debug mode
- ✅ Asset embedding (base64, configurable size limits)
- ✅ Choice condition evaluation
- ✅ Passage lifecycle scripts (onEnter/onExit)

#### Markdown Export (MarkdownExporter)
- ✅ Readable story structure
- ✅ Passage content with choices
- ✅ Variable definitions
- ⚠️ Optional validation report
- ⚠️ Optional quality metrics
- ✅ GitHub-flavored markdown

#### Twine 2 Export (TwineExporter)
- ✅ Harlowe 3.x format
- ✅ Passage preservation
- ✅ Link conversion
- ✅ Tag preservation
- ✅ Position/size metadata
- ⚠️ Limited macro support (exports simple syntax)

#### EPUB Export (EPUBExporter)
- ✅ EPUB 3.0 compliant
- ✅ Image embedding
- ✅ Cover page generation
- ✅ Table of contents
- ✅ Markdown rendering
- ✅ Choice condition display
- ✅ Professional styling
- ✅ E-reader compatible
- ✅ Asset bundling (all media types)

#### Static Site Export (StaticSiteExporter)
- ✅ Standalone HTML files
- ✅ Embedded player
- ✅ Navigation structure
- ✅ No server required
- ✅ SEO-friendly
- ✅ Fast loading

---

## HTML Export Themes

The HTML exporter supports 10 built-in themes:

| Theme ID | Name | Description | Best For |
|----------|------|-------------|----------|
| `default` | Default | Clean and modern default theme | General use |
| `dark` | Dark | Dark theme for low-light reading | Night reading |
| `sepia` | Sepia | Warm sepia tone | Comfortable reading |
| `forest` | Forest | Nature-inspired green theme | Calming atmosphere |
| `ocean` | Ocean | Calming blue ocean theme | Relaxed reading |
| `midnight` | Midnight | Deep midnight blue theme | Dark mode alternative |
| `sunset` | Sunset | Warm sunset colors | Evening reading |
| `highContrast` | High Contrast | Maximum contrast | Accessibility |
| `paper` | Paper | Classic paper and ink | Traditional look |
| `cyberpunk` | Cyberpunk | Neon-inspired futuristic theme | Sci-fi stories |

**Theme Customization:**
- All themes support custom CSS injection
- Custom color schemes via `customTheme` option
- Font customization available
- Per-theme special effects (e.g., cyberpunk glow)

---

## Twine Import Details

### Supported Twine Story Formats

| Format | Status | Macro Support | Variable Support | Notes |
|--------|--------|---------------|------------------|-------|
| **Harlowe** | ⚠️ Good | Basic | Basic | Most common format |
| **SugarCube** | ⚠️ Good | Basic | Basic | Second most common |
| **Chapbook** | ⚠️ Fair | Limited | Limited | Simpler format |
| **Snowman** | ⚠️ Fair | Limited | Limited | JavaScript-based |

### Macro Conversion Support

**Supported Macros** (Auto-converted):
- ✅ `[[Link]]` → Whisker choice syntax
- ✅ `[[Text|Target]]` → Choice with custom text
- ✅ `<<set>>` → Variable assignment (basic)
- ✅ `<<if>>` / `<<else>>` → Conditional content (basic)
- ✅ `<<display>>` → Passage embedding (basic)

**Partially Supported Macros** (May require manual fixes):
- ⚠️ `<<link>>` → Converted to simple choice
- ⚠️ `<<button>>` → Converted to choice
- ⚠️ Complex variable expressions → Simplified
- ⚠️ JavaScript expressions → Comments

**Unsupported Macros** (Preserved as comments):
- ❌ `<<widget>>` → No equivalent (use Lua functions)
- ❌ Time-based modifiers → No equivalent
- ❌ Audio/video macros → Preserved as TODO
- ❌ Advanced SugarCube features → Manual conversion needed

### Conversion Quality Reporting

The TwineImporter provides detailed conversion reports:

```typescript
interface LossReport {
  totalIssues: number;           // Total conversion issues
  critical: ConversionIssue[];   // Features that couldn't convert
  warnings: ConversionIssue[];   // Partial conversions
  info: ConversionIssue[];       // Informational notes
  categoryCounts: Record<string, number>;  // Issues by category
  affectedPassages: string[];    // Which passages need review
  conversionQuality: number;     // 0-1 quality estimate
}
```

**Interpreting Conversion Quality:**
- `1.0` → Perfect conversion, no issues
- `0.8-0.99` → Excellent, minor warnings
- `0.6-0.79` → Good, some manual fixes needed
- `0.4-0.59` → Fair, significant review required
- `<0.4` → Poor, extensive manual work needed

---

## Known Limitations

### Import Limitations

**Twine Import:**
1. **Macro Conversion** - Not all Twine macros have Whisker equivalents
   - **Workaround:** Review conversion report, use Lua for advanced features
2. **JavaScript Expressions** - Complex JS converted to comments
   - **Workaround:** Rewrite using Whisker conditions or Lua
3. **Widget Definitions** - No direct equivalent
   - **Workaround:** Create Lua functions instead
4. **Audio/Video** - Basic preservation only
   - **Workaround:** Use Whisker audio features after import
5. **Styling** - Inline styles may be lost
   - **Workaround:** Apply styles in Whisker editor

**JSON Import:**
1. **Version Compatibility** - Very old formats may fail
   - **Workaround:** Export from older Whisker version first
2. **External Resources** - Absolute paths may break
   - **Workaround:** Use relative paths or embed resources

### Export Limitations

**HTML Export:**
1. **File Size** - Large stories create large HTML files
   - **Mitigation:** Use minification option, consider Static Site export
2. **Browser Compatibility** - Requires modern browser (ES6+)
   - **Mitigation:** Target 2020+ browsers
3. **Embedded Assets** - Large assets increase file size significantly
   - **Mitigation:** Configurable size limits, external asset option
4. **Lua Runtime** - Fengari adds ~200KB to HTML file
   - **Mitigation:** Loaded from CDN, cached by browser

**EPUB Export:**
1. **Interactivity** - Limited compared to web version
   - **Nature of format:** E-readers have limited JavaScript support
2. **Image Size** - Large images increase file size
   - **Mitigation:** Optimize images before export

**Markdown Export:**
1. **No Interactivity** - Static documentation only
   - **By Design:** Not intended for playback
2. **Formatting Loss** - Rich formatting simplified
   - **By Design:** Focus on readability

**Twine Export:**
1. **Macro Support** - Exports simple syntax only
   - **Limitation:** Whisker features → Basic Twine syntax
2. **Advanced Features** - Lua code exported as comments
   - **Expected:** Twine doesn't support Lua

---

## Recommended Workflows

### Workflow 1: Twine → Whisker Migration

```
1. Export from Twine 2 (HTML format)
2. Import to Whisker using TwineImporter
3. Review conversion report (check quality score)
4. Fix critical issues (red items in report)
5. Address warnings (yellow items)
6. Test story playback
7. Save as Whisker JSON (backup)
```

**Expected Outcome:** 80-95% automatic conversion, 5-20% manual review

### Workflow 2: Whisker → Web Distribution

```
1. Validate story (check for errors)
2. Export to HTML with theme selection
3. Test in target browsers
4. Optional: Minify HTML for production
5. Deploy to web hosting
```

**Expected Outcome:** Self-contained HTML file, ~100-500 KB depending on story size

### Workflow 3: Whisker → E-Book

```
1. Validate story
2. Prepare cover image (optional)
3. Export to EPUB format
4. Test on target e-reader device
5. Distribute via e-book platforms
```

**Expected Outcome:** EPUB 3.0 file compatible with Kindle, Kobo, Apple Books, etc.

### Workflow 4: Cross-Platform Development

```
1. Create story in Whisker
2. Save as JSON (version control)
3. Export to multiple formats:
   - HTML for web preview
   - Markdown for documentation
   - EPUB for mobile testing
4. Iterate and repeat
```

**Expected Outcome:** Consistent story across all platforms

### Workflow 5: Collaborative Editing

```
1. Export story as Twine 2 HTML
2. Share with Twine users
3. Re-import changes back to Whisker
4. Review conversion report for conflicts
5. Merge changes manually if needed
```

**Expected Outcome:** Basic compatibility, may lose some Whisker-specific features

---

## Data Loss Scenarios

### Lossless Round-Trips ✅

**Whisker JSON → Whisker JSON**
- ✅ 100% lossless
- All features preserved
- Recommended for backups

**Whisker → HTML → Web**
- ✅ 100% functional
- All interactivity preserved
- Embedded player handles all features

### Lossy Conversions ⚠️

**Twine → Whisker**
- ⚠️ 60-95% automatic conversion
- Macro support varies
- Complex features may require manual work
- Conversion report shows what was lost

**Whisker → Twine**
- ⚠️ ~70% feature preservation
- Lua code exported as comments
- Advanced features simplified
- Basic story structure preserved

**Whisker → Markdown**
- ⚠️ Documentation only, not playable
- By design - for review and sharing
- No interactivity loss (format doesn't support it)

**Whisker → EPUB**
- ⚠️ Limited interactivity
- E-reader platform constraint
- Choices work, advanced features may not

---

## Testing Coverage

### Import Package (@writewhisker/import)
- **Total Tests:** 105
- **Coverage:** >80% target
- **Test Files:**
  - `JSONImporter.test.ts` (26 tests)
  - `TwineImporter.test.ts` (79 tests)
  - `TwineImporter.integration.test.ts` (real-world files)

### Export Package (@writewhisker/export)
- **Total Tests:** 129
- **Coverage:** >80% target
- **Test Files:**
  - `HTMLExporter.test.ts`
  - `MarkdownExporter.test.ts`
  - `TwineExporter.test.ts`
  - `EPUBExporter.test.ts` (34 tests)
  - `WhiskerCoreExporter.test.ts`
  - `StaticSiteExporter.test.ts`

**Total Test Coverage:** 234 tests across import/export systems

---

## Future Enhancements

### Planned (Phase 3C)
- ⏳ Additional HTML themes (4 new themes planned)
- ⏳ Better error messages in importers
- ⏳ Conversion suggestions for unsupported features

### Considered (Phase 4+)
- 🔮 PDF export (8-10 hours effort)
- 🔮 Enhanced Twine macro support (4-6 hours)
- 🔮 Twine 1.x legacy support (6-8 hours)

### Out of Scope
- ❌ Mobile app templates (requires Capacitor, 2-3 days)
- ❌ Desktop app templates (requires Tauri, 2-3 days)
- ❌ Ink importer (low demand, high effort)
- ❌ ChoiceScript importer (low demand, high effort)

---

## Troubleshooting

### Import Issues

**"Invalid JSON format"**
- **Cause:** Malformed JSON or unsupported version
- **Fix:** Validate JSON syntax, check format version

**"Missing tw-storydata element"**
- **Cause:** Not a valid Twine 2 HTML file
- **Fix:** Ensure file was exported from Twine 2 (not Twine 1)

**"Low conversion quality (< 0.5)"**
- **Cause:** Many unsupported macros or complex features
- **Fix:** Review conversion report, manually address critical issues

**"Story has no passages"**
- **Cause:** Import failed to parse passages
- **Fix:** Check source format, ensure passages exist

### Export Issues

**"Story has no start passage"**
- **Cause:** Start passage not set
- **Fix:** Set start passage in Whisker editor before export

**"Large file size (>10 MB)"**
- **Cause:** Large story with many passages or embedded media
- **Fix:** Use minification, optimize images, or use Static Site export

**"EPUB not readable on device"**
- **Cause:** Device compatibility issue
- **Fix:** Test on different e-reader, ensure EPUB 3.0 support

---

## API Reference

### Import Example

```typescript
import { JSONImporter, TwineImporter } from '@writewhisker/import';

// Import JSON
const jsonImporter = new JSONImporter();
const result = await jsonImporter.import({
  data: jsonString,
  options: {
    validateAfterImport: true,
    preserveIds: true,
  }
});

if (result.success) {
  console.log(`Imported ${result.passageCount} passages`);
  const story = result.story;
}

// Import Twine with conversion tracking
const twineImporter = new TwineImporter();
const twineResult = await twineImporter.import({
  data: htmlString,
  options: {
    conversionOptions: {
      convertMacros: true,
      convertVariables: true,
      preserveOriginalSyntax: true,
    }
  }
});

if (twineResult.lossReport) {
  console.log(`Conversion quality: ${twineResult.lossReport.conversionQuality}`);
  console.log(`Issues: ${twineResult.lossReport.totalIssues}`);
}
```

### Export Example

```typescript
import {
  HTMLExporter,
  MarkdownExporter,
  EPUBExporter
} from '@writewhisker/export';

// Export to HTML with theme
const htmlExporter = new HTMLExporter();
const htmlResult = await htmlExporter.export({
  story,
  options: {
    theme: 'dark',
    minifyHTML: true,
    customCSS: '/* your styles */',
  }
});

// Export to Markdown with metrics
const mdExporter = new MarkdownExporter();
const mdResult = await mdExporter.export({
  story,
  validation,
  metrics,
  options: {
    includeValidation: true,
    includeMetrics: true,
  }
});

// Export to EPUB
const epubExporter = new EPUBExporter();
const epubResult = await epubExporter.export({
  story,
  options: {
    coverImage: coverImageBuffer,
    author: 'Author Name',
  }
});
```

---

## Version History

### Version 1.1 (November 2025)
- Added Lua scripting support in HTML exports
- Added player features: undo/redo, save/load, auto-save, debug mode
- Added asset embedding/bundling for HTML and EPUB
- Added v2.1 format support with EditorData preservation
- Enhanced HTML player with full whisker-core feature parity

### Version 1.0 (November 2025)
- Initial documentation
- 2 import formats supported
- 6 export formats supported
- 10 HTML themes available
- 234 tests passing

---

## Related Documentation

- **PHASE_3_PLAN.md** - Implementation plan for Phase 3
- **packages/import/README.md** - Import package documentation
- **packages/export/README.md** - Export package documentation
- **TODO_AUDIT.md** - Known technical debt and planned improvements

---

## Getting Help

**Found a bug or limitation?**
- Check existing GitHub issues
- Review this matrix for known limitations
- Create new issue with details and example file

**Need a new format?**
- Create GitHub issue with use case
- Provide example files
- Describe expected behavior

**Contributing:**
- See CONTRIBUTING.md for guidelines
- Import/Export packages welcome PRs
- Test coverage required for new features

---

**Last Updated:** November 19, 2025
**Maintained By:** Whisker Editor Team
**License:** MIT
