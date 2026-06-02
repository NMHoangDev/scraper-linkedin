# Script tạo import_all_data_final_v7.sql từ v6 với các sửa lỗi
$v6Path = 'D:\CrawlDataLinkedin\import_all_data_final_v6.sql'
$v7Path = 'D:\CrawlDataLinkedin\import_all_data_final_v7.sql'

Write-Host "Doc file v6..." -ForegroundColor Cyan
$content = [System.IO.File]::ReadAllText($v6Path, [System.Text.Encoding]::UTF8)

# ─── FIX 1: Thay toàn bộ section public.intents bằng public.categories ───────
Write-Host "Fix 1: Thay intents -> categories..." -ForegroundColor Yellow

# Tìm vị trí bắt đầu và kết thúc của section intents
$intentsStart = "-- 2. CHÈN DỮ LI"  # UTF8 issue - dùng phần đầu
$kpiStart = "-- 3. CHÈN DỮ LI"

# Approach khác: dùng Split/Join trên marker rõ ràng hơn
# Tìm chuỗi bắt đầu của intents section
$intentsMarker = "-- 2. CH"
$kpiMarker = "-- 3. CH"

$idxIntents = $content.IndexOf("INSERT INTO public.intents")
$idxKpi = $content.IndexOf("-- 3. CH")

if ($idxIntents -ge 0 -and $idxKpi -gt $idxIntents) {
    # Lấy phần trước intents
    $beforeIntents = $content.Substring(0, $idxIntents - 40)  # lùi lại trước comment
    
    # Tìm điểm bắt đầu của comment "-- 2."
    $commentStart = $content.LastIndexOf("-- 2.", $idxIntents)
    $beforeIntents = $content.Substring(0, $commentStart)
    
    # Phần sau intents section (bắt đầu từ "-- 3.")
    $afterIntents = $content.Substring($idxKpi)
    
    $newSection = @"
-- 2. CHEN DU LIEU BANG: public.categories (thay the public.intents - bang cu)
-- Dam bao unique constraint ton tai
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS unique_category_type_code;
ALTER TABLE public.categories ADD CONSTRAINT unique_category_type_code UNIQUE (category_type, code);

-- Intent categories
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'AI_Tech', 'AI Technology', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'KOL', 'Influencer / KOL', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'sosanh', 'So Sanh', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'tuvan', 'Tu van', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'Sales', 'Sales / Kinh doanh', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'CongNghe', 'Cong Nghe / Technology', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'intent', 'HR', 'Tuyen dung / HR', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- Industry categories
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'industry', 'artificial_intelligence', 'Artificial Intelligence', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'industry', 'it_software', 'IT & Software', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'industry', 'marketing', 'Marketing & Digital', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'industry', 'finance', 'Finance & Banking', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- Tier categories
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'tier', '1', 'Tier 1 - Uu tien cao', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'tier', '2', 'Tier 2 - Uu tien trung binh', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'tier', '3', 'Tier 3 - Uu tien thap', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- Team categories
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'team', 'Developer Team', 'Developer Team', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'team', 'Growth Team', 'Growth Team', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

-- ICP categories
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'icp', 'Founder_CEO', 'Founder / CEO', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
INSERT INTO public.categories (id, category_type, code, name, platform, created_at, updated_at)
VALUES (uuid_generate_v4(), 'icp', 'Developer', 'Developer / Engineer', 'all', NOW(), NOW())
ON CONFLICT (category_type, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

"@

    $content = $beforeIntents + $newSection + $afterIntents
    Write-Host "  -> Da thay the intents section thanh cong" -ForegroundColor Green
} else {
    Write-Host "  -> CANH BAO: Khong tim thay intents section!" -ForegroundColor Red
}

# ─── FIX 2: Sửa cột linkedin_posts - thêm shares ──────────────────────────────
Write-Host "Fix 2: Them cot shares vao linkedin_posts INSERT..." -ForegroundColor Yellow
$oldCols = 'INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, posted_at, created_at, updated_at)'
$newCols = 'INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)'
$countBefore = ([regex]::Matches($content, [regex]::Escape($oldCols))).Count
$content = $content.Replace($oldCols, $newCols)
$countAfter = ([regex]::Matches($content, [regex]::Escape($newCols))).Count
Write-Host "  -> Da sua $countAfter linkedin_posts INSERT (truoc: $countBefore)" -ForegroundColor Green

# Fix VALUES: thêm 0 (shares) trước giá trị posted_at
# Pattern cuối mỗi VALUES linkedin_posts: integer, integer, TIMESTAMP_OR_NULL, NOW(), NOW())
$countSharesBefore = ([regex]::Matches($content, '\d+, \d+, (''[^'']+''::TIMESTAMPTZ|NULL), NOW\(\), NOW\(\)\)')).Count
$content = [regex]::Replace($content, '(\d+), (\d+), (''[^'']+''::TIMESTAMPTZ|NULL), NOW\(\), NOW\(\)\)', '$1, $2, 0, $3, NOW(), NOW())')
$countSharesAfter = ([regex]::Matches($content, '\d+, \d+, 0, (''[^'']+''::TIMESTAMPTZ|NULL), NOW\(\), NOW\(\)\)')).Count
Write-Host "  -> Da them shares=0 cho $countSharesAfter ban ghi" -ForegroundColor Green

# ─── FIX 3: Thêm facebook_groups TRƯỚC section 8 ─────────────────────────────
Write-Host "Fix 3: Them facebook_groups data..." -ForegroundColor Yellow
$section8Marker = "-- 8."
$idxSection8 = $content.IndexOf($section8Marker)
if ($idxSection8 -ge 0) {
    $beforeSection8 = $content.Substring(0, $idxSection8)
    $fromSection8 = $content.Substring($idxSection8)
    
    $facebookGroupsBlock = @"
-- ==============================================================
-- FIX v7: CHEN DU LIEU BANG: public.facebook_groups
-- (Can thiet de lenh UPDATE dong bo intent/industry/tier cuoi file hoat dong)
-- ==============================================================
ALTER TABLE public.facebook_groups DROP CONSTRAINT IF EXISTS unique_facebook_group_url;
ALTER TABLE public.facebook_groups ADD CONSTRAINT unique_facebook_group_url UNIQUE (group_url);

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Viec lam CNTT Da Nang - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'HR', 'it_software', 1, 'Growth Team', 5000, 30, 80, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Viec lam CNTT Da Nang', 'https://www.facebook.com/groups/vieclamcnttdn', 'HR', 'it_software', 1, 'Growth Team', 8000, 20, 75, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyen Dung IT - Viec lam CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'HR', 'it_software', 2, 'Growth Team', 12000, 15, 70, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Viec lam CNTT', 'https://www.facebook.com/groups/myprofiles', 'HR', 'it_software', 2, 'Growth Team', 20000, 25, 65, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyen dung Thuc tap sinh IT', 'https://www.facebook.com/groups/777110019027822', 'HR', 'it_software', 3, 'Growth Team', 6000, 10, 60, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n moi', 'https://www.facebook.com/groups/hotron8n', 'CongNghe', 'it_software', 2, 'Developer Team', 3000, 20, 70, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiet Ke Web Gia Re - Code MMO', 'https://www.facebook.com/groups/thietkewebvietnam', 'Sales', 'it_software', 3, 'Developer Team', 10000, 30, 60, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, members, posts_per_week, health_score, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hoi thiet ke website va SEO web Online', 'https://www.facebook.com/groups/1998083910206781', 'Sales', 'marketing', 3, 'Growth Team', 15000, 20, 55, FALSE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET intent=EXCLUDED.intent, industry=EXCLUDED.industry, tier=EXCLUDED.tier, team=EXCLUDED.team, updated_at=NOW();

"@
    $content = $beforeSection8 + $facebookGroupsBlock + $fromSection8
    Write-Host "  -> Da them facebook_groups block" -ForegroundColor Green
} else {
    Write-Host "  -> CANH BAO: Khong tim thay section 8!" -ForegroundColor Red
}

# ─── FIX 4: Thêm crawl_sessions TRƯỚC section 5 (linkedin_groups) ────────────
Write-Host "Fix 4: Them crawl_sessions data..." -ForegroundColor Yellow
$section5Marker = "-- 5."
$idxSection5 = $content.IndexOf($section5Marker)
if ($idxSection5 -ge 0) {
    $beforeSection5 = $content.Substring(0, $idxSection5)
    $fromSection5 = $content.Substring($idxSection5)
    
    $crawlSessionsBlock = @"
-- ==============================================================
-- FIX v7: CHEN DU LIEU MAU: public.crawl_sessions
-- ==============================================================
ALTER TABLE public.crawl_sessions DROP CONSTRAINT IF EXISTS unique_crawl_session_id;
ALTER TABLE public.crawl_sessions ADD CONSTRAINT unique_crawl_session_id UNIQUE (session_id);

INSERT INTO public.crawl_sessions (id, session_id, email_crawl, platform, group_name, group_url, posts_count, status, created_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_5874469154247', 'ngminhhoang0934@gmail.com', 'linkedin', 'AI, IT & Transformation in Accounting, Finance, Bank', 'https://www.linkedin.com/groups/52007/', 10, 'completed', NOW())
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.crawl_sessions (id, session_id, email_crawl, platform, group_name, group_url, posts_count, status, created_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_2504727172768', 'ngminhhoang0934@gmail.com', 'linkedin', 'AI, IT & Transformation group', 'https://www.linkedin.com/groups/52007/', 8, 'completed', NOW())
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.crawl_sessions (id, session_id, email_crawl, platform, group_name, group_url, posts_count, status, created_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_6068744175548', 'lnquynh.digitalmkt.work@gmail.com', 'linkedin', 'AI & Data Community', 'https://www.linkedin.com/groups/6610234/', 8, 'completed', NOW())
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.crawl_sessions (id, session_id, email_crawl, platform, group_name, group_url, posts_count, status, created_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_9863343159603', 'kangtaeoh112001@gmail.com', 'linkedin', 'AI & Machine Learning Community', 'https://www.linkedin.com/groups/961087/', 5, 'completed', NOW())
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.crawl_sessions (id, session_id, email_crawl, platform, group_name, group_url, posts_count, status, created_at)
VALUES (uuid_generate_v4(), 'facebook_session_vieclamcntt_20260529', 'ngminhhoang0934@gmail.com', 'facebook', 'Viec lam CNTT Da Nang - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 50, 'completed', NOW())
ON CONFLICT (session_id) DO NOTHING;

"@
    $content = $beforeSection5 + $crawlSessionsBlock + $fromSection5
    Write-Host "  -> Da them crawl_sessions block" -ForegroundColor Green
} else {
    Write-Host "  -> CANH BAO: Khong tim thay section 5!" -ForegroundColor Red
}

# ─── FIX 5: Thêm UPDATE shares=0 fallback SAU section 9 ──────────────────────
Write-Host "Fix 5: Them UPDATE shares fallback..." -ForegroundColor Yellow
$section10Marker = "-- 10."
$idxSection10 = $content.IndexOf($section10Marker)
if ($idxSection10 -ge 0) {
    $beforeSection10 = $content.Substring(0, $idxSection10)
    $fromSection10 = $content.Substring($idxSection10)
    $sharesFixup = @"
-- ==============================================================
-- FIX v7: Cap nhat shares=0 cho cac linkedin_posts con NULL
-- ==============================================================
UPDATE public.linkedin_posts SET shares = 0 WHERE shares IS NULL;

"@
    $content = $beforeSection10 + $sharesFixup + $fromSection10
    Write-Host "  -> Da them UPDATE shares fallback" -ForegroundColor Green
}

# ─── Ghi file v7 ──────────────────────────────────────────────────────────────
Write-Host "Ghi file v7..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText($v7Path, $content, [System.Text.Encoding]::UTF8)

$sizeKB = [Math]::Round((Get-Item $v7Path).Length / 1KB, 1)
Write-Host ""
Write-Host "HOAN THANH! File: $v7Path ($sizeKB KB)" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "=== KIEM TRA KET QUA ===" -ForegroundColor Cyan
$check = [System.IO.File]::ReadAllText($v7Path, [System.Text.Encoding]::UTF8)
$cntIntents = ([regex]::Matches($check, 'INSERT INTO public\.intents')).Count
$cntCats = ([regex]::Matches($check, 'INSERT INTO public\.categories')).Count
$cntFbGroups = ([regex]::Matches($check, 'INSERT INTO public\.facebook_groups')).Count
$cntCrawlSess = ([regex]::Matches($check, 'INSERT INTO public\.crawl_sessions')).Count
$cntLiPostsCols = ([regex]::Matches($check, 'likes, comments, shares, posted_at')).Count
$cntSharesUpd = ([regex]::Matches($check, 'UPDATE public\.linkedin_posts SET shares')).Count

Write-Host "[Fix 1] INSERT public.intents con lai:   $cntIntents (can = 0)" -ForegroundColor $(if ($cntIntents -eq 0) { 'Green' } else { 'Red' })
Write-Host "[Fix 1] INSERT public.categories:        $cntCats (can > 0)" -ForegroundColor $(if ($cntCats -gt 0) { 'Green' } else { 'Red' })
Write-Host "[Fix 2] linkedin_posts co cot shares:    $cntLiPostsCols inserts" -ForegroundColor $(if ($cntLiPostsCols -gt 0) { 'Green' } else { 'Red' })
Write-Host "[Fix 3] INSERT public.facebook_groups:   $cntFbGroups (can >= 8)" -ForegroundColor $(if ($cntFbGroups -ge 8) { 'Green' } else { 'Red' })
Write-Host "[Fix 4] INSERT public.crawl_sessions:    $cntCrawlSess (can >= 5)" -ForegroundColor $(if ($cntCrawlSess -ge 5) { 'Green' } else { 'Red' })
Write-Host "[Fix 5] UPDATE linkedin_posts shares:    $cntSharesUpd (can = 1)" -ForegroundColor $(if ($cntSharesUpd -eq 1) { 'Green' } else { 'Red' })
