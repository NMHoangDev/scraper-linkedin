# TODO - AI LỌC NGẦM BÀI VIẾT KHÔNG LIÊN QUAN (POST FEED)

## Phase 1: Prompt + classifier hardening (no delete)
- [ ] Update `app/modules/all_platform/services/post_relevance_ai_service.py`
  - [ ] Enforce strict output JSON schema: `{label, confidence, reason}`
  - [ ] Input payload must be `{content, group_industry, group_intent}`
  - [ ] Add confidence rule: if `confidence < 0.7` => force `seeding_ok`
  - [ ] Fail-safe: timeout/JSON parse/invalid output => label=`seeding_ok`, confidence=0.0, ai_success=false
- [ ] Add local prompt test runner script (5 test cases) to verify labels

## Phase 2: DRY-RUN classify over DB (log only)
- [ ] Implement `post_feed_filter_service.py`
  - [ ] Fetch all candidate `facebook_posts` rows (scoped by member where possible)
  - [ ] For each post, build AI input using row fields (content + group intent/industry)
  - [ ] Call AI in batches with delay
  - [ ] Write classification results into `facebook_posts_deleted_log` (create usage assumes table exists)
  - [ ] Compute stats + reject ratio > 50% => stop and log CRITICAL
- [ ] Hook dry-run into extension crawl (`routers/extension_crawl.py`) after saving posts
  - [ ] Ensure dry-run runs immediately after insert
  - [ ] Never delete in this phase

## Phase 3: REAL delete (manual approval)
- [ ] Add endpoint or env flag to enable real delete only after dry-run approval
- [ ] Implement real delete using existing `DELETE /unified/posts/facebook` semantics
  - [ ] Ensure member scoping is respected
  - [ ] Log deletions fully into the same deleted_log table

## Phase 4: Verification
- [ ] Dry-run on real group and review top 10-15 predicted rejects
- [ ] Enable real delete, verify disappear behavior + logs
- [ ] Final report with PASS/FAIL evidence for steps 0..3

