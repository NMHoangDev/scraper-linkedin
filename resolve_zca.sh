#!/bin/bash
cd /opt/apps/seeding_markeeai/scraper-linkedin

# ==== ZALO/ZCA FILES: use THEIRS (origin/feature/zalo-restyle-form-v2) ====
ZCA_FILES=(
  "linkedin_group_crawler/package.json"
  "linkedin_group_crawler/package-lock.json"
  "linkedin_group_crawler/scripts/zca_api_bridge.js"
  "linkedin_group_crawler/scripts/zca_persistent_listener.js"
  "linkedin_group_crawler/test_zca.py"
)

for f in "${ZCA_FILES[@]}"; do
  echo ">>> Resolving $f with THEIRS..."
  git checkout --theirs "$f"
  git add "$f"
done

echo "ZCA files resolved."
