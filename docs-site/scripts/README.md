# SpecWeave Image Generation Scripts

## Hero Image Generator

Generates hero images for the SpecWeave Docusaurus homepage using **Google Gemini 2.5 Flash Image** (aka "nano banana").

### Prerequisites

1. **Get a Gemini API Key**:
   - Visit: https://aistudio.google.com/apikey
   - Create or select a project
   - Generate an API key

2. **Set up environment**:
   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit .env and add your API key
   echo "GEMINI_API_KEY=your-actual-key-here" > .env
   ```

### Usage

```bash
# Generate all hero images
npm run generate:hero-images
```

### What Gets Generated

Three hero images with SpecWeave branding:

1. **easy-to-use.png** - "Easy to Use" section
   - Theme: Simplicity and quick setup
   - Elements: Mountains, friendly dinosaur, geometric shapes
   - Colors: Blue-purple gradient (#667eea → #764ba2)

2. **focus-on-what-matters.png** - "Focus on What Matters" section
   - Theme: Concentration on documentation
   - Elements: Screen with code, dinosaur focused on work
   - Colors: Blue-purple gradient

3. **powered-by-react.png** - "Powered by React" section
   - Theme: Extensibility and modularity
   - Elements: Modular components, dinosaur with UI elements
   - Colors: Blue-purple gradient

### Output

- **Location**: `static/img/hero/`
- **Format**: PNG (1024x1024px or similar, aspect ratio 16:9)
- **Watermark**: SynthID (Google's authenticity watermark)

### Cost

- **Pricing**: $30 per 1 million tokens
- **Per image**: 1290 tokens = **$0.039 per image**
- **Total for 3 images**: ~$0.12

### Troubleshooting

**Error: "GEMINI_API_KEY environment variable not set"**
- Solution: Create a `.env` file with your API key (see Prerequisites)

**Error: "No image generated"**
- Solution: Check your API key is valid and has quota remaining
- Verify your GCP project has the Gemini API enabled

**Images don't match brand colors**
- Adjust `temperature` in the script (lower = more consistent)
- Modify the prompts to emphasize color requirements

### Next Steps

After generating images:

1. Review images in `static/img/hero/`
2. Update `src/pages/index.tsx` with new image paths
3. Test in both light and dark modes
4. Commit changes to git

### Related Files

- **Script**: `scripts/generate-hero-images.js`
- **Config**: `.env` (gitignored), `.env.example` (template)
- **Output**: `static/img/hero/*.png`
