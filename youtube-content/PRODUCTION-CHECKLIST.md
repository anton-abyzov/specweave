# YouTube Course Production Checklist

**Purpose**: Tactical action plan for creating SpecWeave YouTube course
**Timeline**: 4 weeks to first video published
**Last Updated**: 2025-01-26

---

## Phase 1: Pre-Production (Week 1) ✅

### Day 1-2: Content Review & Planning

- [ ] **Read masterclass script** (`scripts/001-specweave-masterclass.md`)
  - [ ] Read through completely (170 minutes)
  - [ ] Mark sections that need emphasis
  - [ ] Note any outdated info or updates needed
  - [ ] Practice timing for each section

- [ ] **Test demos** (CRITICAL - must work flawlessly)
  - [ ] Greenfield Demo (`demos/greenfield-demo.md`)
    - [ ] Run all commands step-by-step
    - [ ] Verify expected outputs
    - [ ] Note any issues or errors
    - [ ] Time each section (should total ~30 min)
  - [ ] Brownfield Demo (`demos/brownfield-easychamp-demo.md`)
    - [ ] Clone EasyChamp repository
    - [ ] Run all commands step-by-step
    - [ ] Verify expected outputs
    - [ ] Time each section (should total ~40 min)

- [ ] **Decision: Channel strategy**
  - [ ] Option A: Create "SpecWeave Official" channel (recommended)
  - [ ] Option B: Use personal channel with dedicated playlist
  - [ ] Create channel if new (name, branding, description)

### Day 3-4: Equipment & Software Setup

- [ ] **Recording Software**
  - [ ] Download OBS Studio (https://obsproject.com/)
  - [ ] Install and configure
  - [ ] Test screen capture (1920x1080 minimum)
  - [ ] Test audio recording
  - [ ] Configure scenes:
    - [ ] Full screen (for demos)
    - [ ] Screen + webcam (for intro/outro)
    - [ ] Slides only (for concept sections)

- [ ] **Audio Setup**
  - [ ] Test built-in microphone quality
  - [ ] **DECISION**: Is audio quality acceptable?
    - [ ] YES → Proceed with built-in mic
    - [ ] NO → Order USB microphone (Blue Yeti ~$130)
      - [ ] Amazon: 1-2 day delivery
      - [ ] Test immediately when arrives
  - [ ] Find quiet recording space
  - [ ] Test for echo, background noise
  - [ ] Record 5-minute test clip
  - [ ] Review audio quality

- [ ] **Video Setup**
  - [ ] Clean desktop background (minimize distractions)
  - [ ] Configure terminal theme (high contrast, large font)
    - [ ] Font size: 16-18pt minimum
    - [ ] Theme: Dark with high contrast
    - [ ] Hide unnecessary toolbars
  - [ ] Test screen recording (30 seconds)
  - [ ] Verify video quality (sharp, readable)

- [ ] **Editing Software**
  - [ ] Download DaVinci Resolve (free)
  - [ ] Install and configure
  - [ ] Watch quick tutorial (30 min)
  - [ ] Test basic editing (cut, transitions)

### Day 5-6: Demo Environment Preparation

- [ ] **Greenfield Demo Environment**
  - [ ] Create clean directory: `~/SpecWeave-Demos/taskmaster/`
  - [ ] Verify Node.js installed (`node --version`)
  - [ ] Verify npm installed (`npm --version`)
  - [ ] Pre-install SpecWeave dependencies
  - [ ] Test complete demo flow (dry run)
  - [ ] Note exact commands and timing

- [ ] **Brownfield Demo Environment**
  - [ ] Clone EasyChamp: `git clone https://github.com/antonabyzov/easychamp`
  - [ ] Create separate branch: `git checkout -b specweave-demo`
  - [ ] Verify project runs locally
  - [ ] Prepare database (if needed)
  - [ ] Test complete demo flow (dry run)
  - [ ] Note exact commands and timing

- [ ] **Backup Plan**
  - [ ] Record demos separately (can edit in)
  - [ ] Have fallback examples ready
  - [ ] Prepare "cut to" moments if live demo fails

### Day 7: Final Pre-Production

- [ ] **Script Finalization**
  - [ ] Print script (or prepare teleprompter)
  - [ ] Mark sections: [SLIDE], [DEMO], [CODE]
  - [ ] Add notes for emphasis, pauses
  - [ ] Prepare talking points (bullet points)

- [ ] **Recording Schedule**
  - [ ] Block calendar for recording days
  - [ ] Optimal times: Morning (quiet, fresh voice)
  - [ ] Plan breaks every 30-45 min
  - [ ] Schedule: 3-4 hour blocks

- [ ] **Thumbnail Preparation**
  - [ ] Sign up for Canva (free tier)
  - [ ] Create thumbnail template:
    - [ ] Size: 1280x720px
    - [ ] Text: Large, high contrast
    - [ ] Style: Clean, professional
  - [ ] Draft 3 thumbnail concepts
  - [ ] Get feedback (optional)

---

## Phase 2: Production (Week 2) 🎬

### Recording Strategy

**Option A**: Record in sections (recommended)
- Section 1-3 (Day 1): Introduction & concepts
- Section 5 (Day 2): Greenfield demo
- Section 6 (Day 3): Brownfield demo
- Section 7-10 (Day 4): Advanced topics & wrap-up

**Option B**: Record in one take (risky)
- Full 2h 50min recording
- More mistakes, but authentic feel

**Recommendation**: Option A (sections)

### Day 1: Introduction & Concepts (Sections 1-3)

**Duration**: 30 minutes of content (~1.5 hours recording with retakes)

- [ ] **Setup**
  - [ ] Close all unnecessary apps
  - [ ] Silence phone, notifications
  - [ ] Start OBS recording
  - [ ] Test audio levels (should peak at -12dB to -6dB)

- [ ] **Section 1: Introduction (5 min)**
  - [ ] Record welcome + overview
  - [ ] Introduce yourself
  - [ ] Set expectations (duration, topics)
  - [ ] **Save file**: `section-1-intro.mp4`

- [ ] **Section 2: The Problem (10 min)**
  - [ ] Explain vibe coding problems
  - [ ] Show context overload examples
  - [ ] Brownfield regression risks
  - [ ] **Save file**: `section-2-problem.mp4`

- [ ] **Section 3: Framework Comparisons (15 min)**
  - [ ] BMAD comparison
  - [ ] SpecKit comparison
  - [ ] When to choose SpecWeave
  - [ ] **Save file**: `section-3-comparisons.mp4`

- [ ] **Review**
  - [ ] Watch recordings (check audio/video quality)
  - [ ] Note any sections to re-record
  - [ ] Re-record problem sections immediately

### Day 2: Greenfield Demo (Section 5)

**Duration**: 30 minutes of content (~2 hours with retakes)

- [ ] **Preparation**
  - [ ] Clean demo environment ready
  - [ ] Commands copied to clipboard
  - [ ] Browser tabs prepared
  - [ ] Start OBS recording

- [ ] **Demo Flow** (Follow `demos/greenfield-demo.md`)
  - [ ] Part 1: Project Setup (5 min)
  - [ ] Part 2: Writing Specifications (7 min)
  - [ ] Part 3: Feature Planning (8 min)
  - [ ] Part 4: Implementation (10 min)
  - [ ] **Save file**: `section-5-greenfield-demo.mp4`

- [ ] **Backup Plan**
  - [ ] If demo fails: "Let me show you the result"
  - [ ] Cut to pre-recorded successful demo
  - [ ] Narrate over the successful run

- [ ] **Review**
  - [ ] Verify all commands visible
  - [ ] Check audio narration clear
  - [ ] Confirm outputs match expectations

### Day 3: Brownfield Demo (Section 6)

**Duration**: 40 minutes of content (~2.5 hours with retakes)

- [ ] **Preparation**
  - [ ] EasyChamp environment ready
  - [ ] Database seeded (if needed)
  - [ ] Commands prepared
  - [ ] Start OBS recording

- [ ] **Demo Flow** (Follow `demos/brownfield-easychamp-demo.md`)
  - [ ] Part 1: Project Onboarding (5 min)
  - [ ] Part 2: Analyzing Authentication (8 min)
  - [ ] Part 3: Creating Regression Tests (7 min)
  - [ ] Part 4: Planning New Feature (8 min)
  - [ ] Part 5: Safe Implementation (10 min)
  - [ ] Part 6: Validation (2 min)
  - [ ] **Save file**: `section-6-brownfield-demo.mp4`

- [ ] **Review**
  - [ ] Verify all commands visible
  - [ ] Check narration explains each step
  - [ ] Confirm safety principles clear

### Day 4: Advanced Topics & Wrap-up (Sections 7-10)

**Duration**: 30 minutes of content (~1.5 hours recording)

- [ ] **Section 7: Advanced Features (20 min)**
  - [ ] Skills system deep dive
  - [ ] Context manifests
  - [ ] Custom skills creation
  - [ ] **Save file**: `section-7-advanced.mp4`

- [ ] **Section 8: Testing (15 min)**
  - [ ] Skill testing walkthrough
  - [ ] E2E with Playwright
  - [ ] Truth-telling tests
  - [ ] **Save file**: `section-8-testing.mp4`

- [ ] **Section 9: Best Practices (10 min)**
  - [ ] Workflow tips
  - [ ] Common mistakes
  - [ ] Recommendations
  - [ ] **Save file**: `section-9-best-practices.mp4`

- [ ] **Section 10: Conclusion (5 min)**
  - [ ] Recap key points
  - [ ] Resources (GitHub, docs)
  - [ ] Call to action (subscribe, try SpecWeave)
  - [ ] **Save file**: `section-10-conclusion.mp4`

---

## Phase 3: Post-Production (Week 3) ✂️

### Editing Workflow

**Tools**: DaVinci Resolve (free)

**Timeline**: 8-10 hours of editing

### Day 1-2: Rough Cut

- [ ] **Import all sections**
  - [ ] Create new project: "SpecWeave-Masterclass"
  - [ ] Import all section files
  - [ ] Organize in timeline order

- [ ] **Basic Editing**
  - [ ] Cut dead air (pauses longer than 2 seconds)
  - [ ] Remove obvious mistakes (unless re-recorded)
  - [ ] Trim beginning/end of each section
  - [ ] Ensure smooth transitions between sections

- [ ] **Audio Cleanup**
  - [ ] Normalize audio levels (-16 LUFS for YouTube)
  - [ ] Remove background noise (if needed)
  - [ ] Add fade in/out at start/end

- [ ] **Rough Cut Complete**
  - [ ] Export rough cut: `SpecWeave-Masterclass-ROUGH.mp4`
  - [ ] Watch entire video (2h 50min)
  - [ ] Note sections needing improvement

### Day 3-4: Fine Cut

- [ ] **Visual Polish**
  - [ ] Add chapter markers (10 sections)
  - [ ] Add text overlays for key points (optional)
  - [ ] Highlight important terminal commands (zoom in if needed)
  - [ ] Add transitions between major sections (simple fade)

- [ ] **Intro/Outro**
  - [ ] Create 5-second intro (title card)
    - [ ] "SpecWeave Masterclass"
    - [ ] "Specification-Driven AI Development"
  - [ ] Create 10-second outro (call to action)
    - [ ] Subscribe, GitHub link, documentation
    - [ ] End screen (YouTube feature)

- [ ] **Color Correction**
  - [ ] Adjust brightness/contrast (if needed)
  - [ ] Ensure terminal text is readable
  - [ ] Consistent color throughout

- [ ] **Final Review**
  - [ ] Export fine cut: `SpecWeave-Masterclass-FINAL.mp4`
  - [ ] Watch entire video again
  - [ ] Check audio quality throughout
  - [ ] Verify chapter markers work
  - [ ] Confirm duration (target: 2h 45min - 2h 55min)

### Day 5: Thumbnail & Assets

- [ ] **Thumbnail Creation** (Canva)
  - [ ] Use template from pre-production
  - [ ] Final design:
    - [ ] Title: "SpecWeave Masterclass"
    - [ ] Subtitle: "Spec-Driven AI Development"
    - [ ] Visual: Code snippet or framework diagram
    - [ ] High contrast, readable on mobile
  - [ ] Export: `SpecWeave-Masterclass-Thumbnail.png` (1280x720)
  - [ ] Get feedback (optional)

- [ ] **Description Writing**
  - [ ] See template below
  - [ ] Add timestamps for all 10 sections
  - [ ] Include resource links
  - [ ] SEO-optimized keywords

- [ ] **Tags Preparation**
  - [ ] Primary: SpecWeave, Claude Code, AI Development
  - [ ] Secondary: spec-driven, software architecture, brownfield
  - [ ] Long-tail: AI code generation best practices, specification-first development

---

## Phase 4: Publishing (Week 4) 🚀

### Day 1-2: YouTube Upload

- [ ] **Upload Video**
  - [ ] Go to YouTube Studio (studio.youtube.com)
  - [ ] Click "Create" → "Upload videos"
  - [ ] Upload: `SpecWeave-Masterclass-FINAL.mp4`

- [ ] **Video Details**
  - [ ] Title: "SpecWeave Masterclass: Specification-Driven AI Development Tutorial (2025)"
  - [ ] Description: (see template below)
  - [ ] Thumbnail: Upload `SpecWeave-Masterclass-Thumbnail.png`
  - [ ] Playlist: Create "SpecWeave Tutorials"
  - [ ] Tags: Add all prepared tags (max 500 characters)

- [ ] **Advanced Settings**
  - [ ] Category: Science & Technology
  - [ ] Comments: Enabled (moderation: hold potentially inappropriate)
  - [ ] Ratings: Visible
  - [ ] Age restriction: No
  - [ ] Recording location: (optional)

- [ ] **Monetization** (if eligible)
  - [ ] Enable ads (mid-roll ads for 2h+ video)
  - [ ] Ad placement: Every 10-15 minutes

- [ ] **End Screen** (last 20 seconds)
  - [ ] Subscribe button
  - [ ] Link to best performing video
  - [ ] Link to documentation

- [ ] **Cards** (throughout video)
  - [ ] Card at 30 min: Link to GitHub
  - [ ] Card at 1h: Link to documentation
  - [ ] Card at 1h 30min: Link to comparison videos (future)

- [ ] **Publish Settings**
  - [ ] Visibility: **UNLISTED** (first 24 hours for testing)
  - [ ] Publish date: Immediate (change to PUBLIC after testing)

### Day 3: Pre-Launch Testing

- [ ] **Quality Check**
  - [ ] Watch video on YouTube (not local file)
  - [ ] Test on multiple devices:
    - [ ] Desktop (Chrome, Firefox)
    - [ ] Mobile (iOS/Android)
    - [ ] Tablet
  - [ ] Verify chapter markers work
  - [ ] Test end screen links
  - [ ] Check cards appear correctly

- [ ] **Description Links**
  - [ ] Test all links (GitHub, docs, resources)
  - [ ] Verify timestamps work (click each one)

- [ ] **Engagement Test**
  - [ ] Share UNLISTED link with 2-3 trusted users
  - [ ] Ask for feedback:
    - [ ] Audio quality
    - [ ] Video quality
    - [ ] Pacing
    - [ ] Clarity
    - [ ] Technical accuracy

- [ ] **Fix Issues** (if any)
  - [ ] Re-upload if critical issues found
  - [ ] Update description/tags if needed

### Day 4: Public Launch

- [ ] **Change Visibility to PUBLIC**
  - [ ] YouTube Studio → Videos
  - [ ] Select video → Visibility → Public
  - [ ] Confirm publish

- [ ] **Social Media Announcement**
  - [ ] Twitter/X:
    - [ ] Tweet 1: "Just launched SpecWeave Masterclass! 2h 50min deep dive into spec-driven AI development. [link]"
    - [ ] Tweet 2: "Stop vibe coding. Start spec-driven development with SpecWeave. [link]"
  - [ ] LinkedIn:
    - [ ] Post with professional summary
    - [ ] Tag relevant hashtags (#AI #SoftwareDevelopment #DevTools)
  - [ ] Discord/Slack communities (if member):
    - [ ] Share in relevant channels

- [ ] **Community Posts**
  - [ ] Reddit (wait 24-48 hours after publish):
    - [ ] r/programming (check rules first)
    - [ ] r/MachineLearning
    - [ ] r/webdev
    - [ ] Format: Title + brief description + link
  - [ ] Dev.to:
    - [ ] Write companion blog post
    - [ ] Embed video
    - [ ] Add written summary
  - [ ] Hacker News (48 hours after publish):
    - [ ] Submit: "SpecWeave Masterclass: Spec-Driven AI Development"
    - [ ] Engage with comments professionally

- [ ] **GitHub Repository Update**
  - [ ] Add video link to README.md
  - [ ] Update documentation with video references
  - [ ] Create "Learning Resources" section

### Day 5: Monitor & Engage

- [ ] **Analytics Monitoring**
  - [ ] YouTube Studio → Analytics
  - [ ] Track metrics (first 24 hours):
    - [ ] Views
    - [ ] Average view duration (target: 40%+)
    - [ ] Click-through rate (target: 4%+)
    - [ ] Traffic sources
  - [ ] Note drop-off points (improve in future videos)

- [ ] **Community Engagement**
  - [ ] Respond to YouTube comments (first 24 hours critical)
  - [ ] Answer questions
  - [ ] Thank viewers for feedback
  - [ ] Pin top comment (ask engaging question)

- [ ] **Feedback Collection**
  - [ ] Create spreadsheet for feedback tracking
  - [ ] Note common questions
  - [ ] Identify topics for follow-up videos
  - [ ] Track feature requests

---

## Video Description Template

```markdown
🚀 SpecWeave Masterclass: Specification-Driven AI Development

Learn how to move from chaotic "vibe coding" to structured spec-driven development with AI assistance. This comprehensive masterclass covers everything from core concepts to production implementation.

⏱️ TIMESTAMPS:
00:00 - Introduction
05:00 - The Problem SpecWeave Solves
15:00 - Framework Comparisons (BMAD, SpecKit)
30:00 - Core Concepts
50:00 - Greenfield Demo: Building TaskMaster
1:20:00 - Brownfield Demo: Transforming EasyChamp
2:00:00 - Advanced Features (Skills, Context Manifests)
2:20:00 - Testing Philosophy (Skills Tests, E2E with Playwright)
2:35:00 - Best Practices
2:45:00 - Conclusion & Resources

📚 RESOURCES:
🔗 SpecWeave GitHub: https://github.com/[your-username]/specweave
🔗 Documentation: [link to docs]
🔗 CLAUDE.md Guide: [link]
🔗 EasyChamp Demo: https://github.com/antonabyzov/easychamp

💡 WHAT YOU'LL LEARN:
✅ Specification-first development workflow
✅ Context precision (70%+ token reduction)
✅ Brownfield safety (prevent regression)
✅ Skills-based architecture
✅ Living documentation with hooks
✅ E2E testing with Playwright
✅ Truth-telling tests (closed-loop validation)

🎯 WHO THIS IS FOR:
- Senior developers frustrated with vibe coding
- Technical architects designing AI-assisted systems
- Tech leads managing brownfield projects
- AI tool power users (Claude Code, Cursor, Copilot)

🏗️ PROJECTS DEMONSTRATED:
1. TaskMaster - Greenfield app built from scratch
2. EasyChamp - Production brownfield transformation

📊 KEY FEATURES COVERED:
- Modular specifications (enterprise scale)
- Context manifests (precise loading)
- Auto-role routing (skill detection)
- Regression prevention (brownfield safety)
- Post-task hooks (auto-documentation)

💬 Questions? Comment below!
👍 Like if this helped you!
🔔 Subscribe for more AI development content!

#SpecWeave #ClaudeCode #AIDevelopment #SoftwareArchitecture #SpecDriven #Brownfield #DevTools #AI #Programming
```

---

## Success Metrics (First 30 Days)

Track these metrics in YouTube Analytics:

- [ ] **Views**: Target 1,000+ (conservative)
- [ ] **Watch Time**: Target 40%+ average view duration
- [ ] **Engagement**: Target 50+ likes, 10+ comments
- [ ] **CTR**: Target 4%+ (thumbnail click-through rate)
- [ ] **Traffic Sources**:
  - [ ] YouTube search: 30-40%
  - [ ] External (Reddit, etc.): 30-40%
  - [ ] Suggested videos: 20-30%
- [ ] **Subscribers**: Target 20-50 new subscribers

---

## Troubleshooting

### Common Issues & Solutions

**Issue**: Audio quality poor
- **Solution**: Use USB microphone (Blue Yeti), record in quiet room

**Issue**: Demo fails during recording
- **Solution**: Cut to pre-recorded successful demo, narrate over it

**Issue**: Video file too large (YouTube limit: 256GB)
- **Solution**: Compress with Handbrake (H.264, CRF 23)

**Issue**: Low view count in first week
- **Solution**: Cross-post to Reddit, Dev.to, Hacker News (wait 24-48 hours first)

**Issue**: High drop-off rate at specific timestamp
- **Solution**: Note for re-edit in Phase 2 (series split)

---

## Phase 2 Planning (Weeks 5-8)

**After 30 days, evaluate metrics:**

**If successful** (1,000+ views, 40%+ retention):
- [ ] Plan series split (10-15 videos)
- [ ] Use retention data to optimize splits
- [ ] Re-edit into series format

**If metrics below target**:
- [ ] Analyze drop-off points
- [ ] Gather user feedback
- [ ] Consider shorter intro video (5-10 min)
- [ ] Improve SEO (title, description, tags)

---

## Tools & Resources

### Recording
- **OBS Studio**: https://obsproject.com/
- **OBS Tutorial**: https://www.youtube.com/watch?v=EuSUPpoi0Vs

### Editing
- **DaVinci Resolve**: https://www.blackmagicdesign.com/products/davinciresolve
- **DaVinci Tutorial**: https://www.youtube.com/watch?v=63Ln33O4p4c

### Thumbnails
- **Canva**: https://www.canva.com/
- **Photopea** (Photoshop alternative): https://www.photopea.com/

### Audio
- **Audacity** (audio editing): https://www.audacityteam.org/
- **Blue Yeti Mic**: https://www.amazon.com/Blue-Yeti-USB-Microphone-Blackout/dp/B00N1YPXW2

### Learning
- **YouTube Creator Academy**: https://creatoracademy.youtube.com/
- **Video SEO Guide**: https://backlinko.com/youtube-seo

---

## Final Checklist Before Launch

- [ ] ✅ Video recorded and edited
- [ ] ✅ Thumbnail created (1280x720)
- [ ] ✅ Description written with timestamps
- [ ] ✅ Tags prepared
- [ ] ✅ End screen configured
- [ ] ✅ Cards added
- [ ] ✅ Tested on UNLISTED (multiple devices)
- [ ] ✅ Feedback incorporated
- [ ] ✅ Social media posts drafted
- [ ] ✅ Community posts planned
- [ ] ✅ Analytics tracking setup
- [ ] ✅ **PUBLISH TO PUBLIC**

---

**Ready to ship! 🚀**

**Estimated Total Time**: 40-50 hours over 4 weeks

**Expected Outcome**: 1,000+ views in 30 days, 50+ SpecWeave users in 90 days

**Let's do this!**

---

**Last Updated**: 2025-01-26
**See Also**:
- [QUICK-DECISION-SUMMARY.md](QUICK-DECISION-SUMMARY.md)
- [COURSE-STRATEGY-ANALYSIS.md](COURSE-STRATEGY-ANALYSIS.md)
- [YOUTUBE-CONTENT-COMPLETE.md](YOUTUBE-CONTENT-COMPLETE.md)
