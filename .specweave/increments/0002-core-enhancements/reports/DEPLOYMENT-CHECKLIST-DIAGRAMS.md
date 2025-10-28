# Diagram SVG Deployment Checklist

**Target**: https://spec-weave.com/docs/overview/introduction

**Generated**: 2025-10-27

---

## ✅ Pre-Deployment Checklist

### 1. Verify SVG Files Generated

- [ ] Both SVG files exist:
  ```bash
  ls -lh .specweave/docs/internal/architecture/diagrams/specweave-workflow*.svg
  ```

- [ ] Expected output:
  ```
  specweave-workflow.svg (224KB)
  specweave-workflow-dark.svg (224KB)
  ```

---

### 2. Test SVG Rendering Locally

- [ ] Open light theme SVG in browser:
  ```bash
  open .specweave/docs/internal/architecture/diagrams/specweave-workflow.svg
  ```

- [ ] Open dark theme SVG in browser:
  ```bash
  open .specweave/docs/internal/architecture/diagrams/specweave-workflow-dark.svg
  ```

- [ ] Verify:
  - All 8 subgraphs visible
  - Text is readable
  - Colors match expectations
  - No rendering errors

---

### 3. Copy SVGs to Docusaurus Static Folder

- [ ] Create diagrams directory:
  ```bash
  mkdir -p static/diagrams
  ```

- [ ] Copy both SVG files:
  ```bash
  cp .specweave/docs/internal/architecture/diagrams/specweave-workflow.svg static/diagrams/
  cp .specweave/docs/internal/architecture/diagrams/specweave-workflow-dark.svg static/diagrams/
  ```

- [ ] Verify files copied:
  ```bash
  ls -lh static/diagrams/
  ```

---

### 4. Update Introduction Page

- [ ] Convert `docs/overview/introduction.md` to `.mdx`:
  ```bash
  mv docs/overview/introduction.md docs/overview/introduction.mdx
  ```

- [ ] Add imports at top of file:
  ```mdx
  ---
  title: Introduction to SpecWeave
  ---

  import ThemedImage from '@theme/ThemedImage';
  ```

- [ ] Replace diagram placeholder with:
  ```mdx
  ## Complete Workflow

  <ThemedImage
    alt="SpecWeave Complete Workflow - 8 phases from initialization to deployment"
    sources={{
      light: '/diagrams/specweave-workflow.svg',
      dark: '/diagrams/specweave-workflow-dark.svg',
    }}
    style={{width: '100%', maxWidth: '1200px', margin: '2rem 0'}}
  />

  ### How to Read This Diagram

  **Color Legend**:
  - 🔵 **Blue boxes**: AI agents (PM, Architect, DevOps, etc.)
  - 🟠 **Orange boxes**: Skills (router, validator, loader, etc.)
  - 🟣 **Purple diamonds**: Decision points (where you provide input)
  - 🟢 **Green boxes**: Success states (milestones completed)
  - 🟡 **Yellow boxes**: Warnings (review needed)

  ... (add workflow phase descriptions)
  ```

---

### 5. Test Docusaurus Build

- [ ] Build documentation site:
  ```bash
  npm run build
  # or
  docusaurus build
  ```

- [ ] Check for errors

- [ ] Start local server:
  ```bash
  npm run serve
  # or
  docusaurus serve
  ```

- [ ] Visit: http://localhost:3000/docs/overview/introduction

- [ ] Verify:
  - Diagram displays correctly in light mode
  - Dark mode toggle switches diagram
  - Diagram is responsive on mobile (test browser DevTools)
  - No console errors

---

### 6. Commit Changes

- [ ] Stage all files:
  ```bash
  git add .mermaidrc.json
  git add scripts/generate-diagram-svgs.sh
  git add package.json
  git add .specweave/docs/internal/architecture/diagrams/specweave-workflow.mmd
  git add .specweave/docs/internal/architecture/diagrams/specweave-workflow*.svg
  git add .specweave/docs/internal/architecture/diagrams/README.md
  git add .specweave/docs/internal/delivery/guides/diagram-svg-generation.md
  git add .specweave/increments/001-core-framework/reports/diagram-svgs-docusaurus.md
  git add .specweave/increments/001-core-framework/reports/svg-generation-summary.md
  git add static/diagrams/
  git add docs/overview/introduction.mdx
  git add CLAUDE.md
  ```

- [ ] Create commit:
  ```bash
  git commit -m "docs: add SVG generation workflow and SpecWeave workflow diagram

  - Install @mermaid-js/mermaid-cli
  - Create .mermaidrc.json for theme configuration
  - Add scripts/generate-diagram-svgs.sh automation
  - Generate workflow diagram SVGs (light + dark)
  - Add comprehensive documentation guides
  - Update CLAUDE.md with SVG generation section
  - Update introduction page with ThemedImage"
  ```

---

### 7. Deploy to Production

- [ ] Push to main/develop branch:
  ```bash
  git push origin develop
  # or
  git push origin main
  ```

- [ ] Verify CI/CD pipeline succeeds

- [ ] Check deployed site: https://spec-weave.com/docs/overview/introduction

- [ ] Verify:
  - Diagram visible in light mode
  - Dark mode switches diagram correctly
  - Mobile responsive
  - Page loads fast (<3s)

---

## 🔄 Future Diagram Updates

### When Diagram Changes

- [ ] Edit source file:
  ```bash
  vim .specweave/docs/internal/architecture/diagrams/specweave-workflow.mmd
  ```

- [ ] Regenerate SVGs:
  ```bash
  npm run generate:diagrams
  ```

- [ ] Copy to static folder:
  ```bash
  cp .specweave/docs/internal/architecture/diagrams/specweave-workflow*.svg static/diagrams/
  ```

- [ ] Verify changes:
  ```bash
  git diff .specweave/docs/internal/architecture/diagrams/specweave-workflow*.svg
  ```

- [ ] Commit and deploy:
  ```bash
  git add .specweave/docs/internal/architecture/diagrams/specweave-workflow.*
  git add static/diagrams/specweave-workflow*.svg
  git commit -m "docs: update workflow diagram"
  git push
  ```

---

## 📊 Success Criteria

- ✅ Both SVG files generated (light + dark)
- ✅ SVGs render correctly in browser
- ✅ Docusaurus build succeeds
- ✅ Diagram displays on introduction page
- ✅ Dark mode switching works
- ✅ Mobile responsive
- ✅ Page loads fast
- ✅ All files committed to git
- ✅ Deployed to production successfully

---

## 🆘 Troubleshooting

### Issue: SVG Not Displaying

**Check**:
1. File path correct in MDX? (`/diagrams/specweave-workflow.svg`)
2. SVG exists in `static/diagrams/`?
3. Docusaurus build succeeded?
4. Browser console errors?

**Fix**: Verify file paths, rebuild, check console

---

### Issue: Dark Mode Not Switching

**Check**:
1. Using `ThemedImage` component?
2. Both light and dark SVGs exist?
3. File paths correct?

**Fix**: Verify `sources` object has both `light` and `dark` keys

---

### Issue: Diagram Too Small on Mobile

**Fix**: Add responsive styling:
```mdx
<ThemedImage
  sources={{...}}
  style={{
    width: '100%',
    maxWidth: '1200px',
    minWidth: '320px'
  }}
/>
```

---

### Issue: Page Load Slow

**Check**: SVG file size

**If >500KB**:
```bash
npm install -g svgo
svgo static/diagrams/specweave-workflow.svg --multipass
```

---

## 📚 Documentation References

- [Diagram SVG Generation Guide](.specweave/docs/internal/delivery/guides/diagram-svg-generation.md)
- [Docusaurus Integration](.specweave/increments/001-core-framework/reports/diagram-svgs-docusaurus.md)
- [Workflow Diagram Validation](.specweave/increments/001-core-framework/reports/workflow-diagram-validation.md)
- [CLAUDE.md](CLAUDE.md#svg-generation-for-reliable-rendering)

---

**Last Updated**: 2025-10-27
**Status**: Ready for deployment
