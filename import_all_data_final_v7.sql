-- ==============================================================
-- KỊCH BẢN CHÈN TOÀN BỘ DỮ LIỆU CHUẨN XÁC, FIX MẢNG & FIX NULL POST_URL (V6)
-- ==============================================================

-- 1. CHÈN DỮ LIỆU BẢNG: public.users
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934@gmail.com', 'Nguyễn Minh Hoàng', 'nmhoang-dev', 'member', 'nmhoang.dev@gmail.com', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'nmhoang.dev@gmail.com', 'Minh Hoàng', 'minh-hoàng-3a7a71408', 'leader', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001@gmail.com', 'Nguyễn Viết thương', 'th%C6%B0%C6%A1ng-nguy%E1%BB%85n-v%C4%83n-351b77288', 'member', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'nmhoang.de@gmail.com', 'Hoàng', 'nmhoang.de', 'member', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work@gmail.com', 'Lê Như Quỳnh', 'lnquynh.digitalmkt.work', 'member', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'junkim160386@gmail.com', 'Jun Kim', 'junkim160386', 'member', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, slug, role, email_leader, created_at, updated_at)
VALUES (uuid_generate_v4(), 'quocvietpham185@gmail.com', 'Quốc Việt', 'duckvn18', 'member', NULL, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, role = EXCLUDED.role, email_leader = EXCLUDED.email_leader, updated_at = NOW();
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (uuid_generate_v4(), 'nguyen@facebook.com', 'nguyen', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (uuid_generate_v4(), 'hung@facebook.com', 'hung', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (uuid_generate_v4(), 'thanh@facebook.com', 'thanh', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (uuid_generate_v4(), 'thao@facebook.com', 'thao', 'member', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

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
-- 3. CHÈN DỮ LIỆU BẢNG: public.kpi_tracker
ALTER TABLE public.kpi_tracker DROP CONSTRAINT IF EXISTS unique_member_kpi_period;
ALTER TABLE public.kpi_tracker ADD CONSTRAINT unique_member_kpi_period UNIQUE (email_member, start_date, end_date);
INSERT INTO public.kpi_tracker (id, email_member, name, url_profile, email_leader, platform, kpi_per_week, start_date, end_date, status, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934@gmail.com', 'Nguyễn Minh Hoàng', 'https://www.linkedin.com/in/nmhoang-dev', 'nmhoang.dev@gmail.com', 'Facebook', 20, '2026-05-25'::DATE, '2026-05-29'::DATE, 'Trễ deadline', NOW(), NOW())
ON CONFLICT (email_member, start_date, end_date) DO UPDATE SET
  kpi_per_week = EXCLUDED.kpi_per_week, status = EXCLUDED.status, url_profile = EXCLUDED.url_profile, updated_at = NOW();

-- 4. CHÈN DỮ LIỆU BẢNG: public.seeding_content_kpi
ALTER TABLE public.seeding_content_kpi DROP CONSTRAINT IF EXISTS unique_link_comment;
ALTER TABLE public.seeding_content_kpi ADD CONSTRAINT unique_link_comment UNIQUE (link_comment);
INSERT INTO public.seeding_content_kpi (id, email_member, name, link_comment, name_profile, platform, content, link_post, verify, current_day, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934@gmail.com', 'Nguyễn Minh Hoàng', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35648235498155163/?comment_id=35704958699149509&__cft__[0]=AZagOQtsW4ctgqnoTvNpINLi9jX6F6nIhaxnxyZzv3LXvMqK2Z6wJ_8kE90UKAkHEohVEeD2NHfwofG0-4tc79wJmuH5327RJw3eUBQ8F5fVEjPa5GQLgWPRCmAgHBWqHH_TNDG0djbZ7xcbc33rK_Zo&__tn__=R]-R', 'Nguyễn Minh Hoàng', 'facebook', '.', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35648235498155163/', 'yes', '2026-05-28'::DATE, NOW(), NOW())
ON CONFLICT (link_comment) DO UPDATE SET
  verify = EXCLUDED.verify, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO public.seeding_content_kpi (id, email_member, name, link_comment, name_profile, platform, content, link_post, verify, current_day, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934@gmail.com', 'Nguyễn Minh Hoàng', 'https://www.facebook.com/groups/327940020092140/posts/980434674842668/?comment_id=980799154806220&__cft__[0]=AZYNKULJ0Yeh8WSH3IeRpeCjT7TC29oR8EOV7QGJaTySpQUlo9a7ocOGmT6j_ACfM6kQvZx3I19lMCn3PzUga7mFZw6d_94s8jPo2YOLFPfVnYUCaxtOKe1KTAaiTq97DpCx_NngPPJtQBjB17NjyYNo&__tn__=R]-R', 'Nguyễn Minh Hoàng', 'facebook', 'thanks', 'https://www.facebook.com/groups/327940020092140/posts/980434674842668/', 'yes', '2026-05-28'::DATE, NOW(), NOW())
ON CONFLICT (link_comment) DO UPDATE SET
  verify = EXCLUDED.verify, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO public.seeding_content_kpi (id, email_member, name, link_comment, name_profile, platform, content, link_post, verify, current_day, created_at, updated_at)
VALUES (uuid_generate_v4(), 'nmhoang.dev@gmail.com', NULL, 'constructed_unique_link_2', NULL, 'facebook', NULL, 'https://www.facebook.com/groups/533932866958136/posts/2908335486184517/', 'pending', NOW()::DATE, NOW(), NOW())
ON CONFLICT (link_comment) DO UPDATE SET
  verify = EXCLUDED.verify, content = EXCLUDED.content, updated_at = NOW();

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
-- 5. CHÈN DỮ LIỆU BẢNG: public.linkedin_groups
ALTER TABLE public.linkedin_groups DROP CONSTRAINT IF EXISTS unique_linkedin_group_url;
ALTER TABLE public.linkedin_groups ADD CONSTRAINT unique_linkedin_group_url UNIQUE (group_url);
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/52007/', 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'lnquynh.digitalmkt.work@gmail.com', 'ACTIVE', 'AI_Tech', 'artificial_intelligence', 1, 'Developer Team', 'Foundeer', NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/6610234/', 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'lnquynh.digitalmkt.work@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/10355230/', 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'lnquynh.digitalmkt.work@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/19269001/', 'Markee', 'junkim160386@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/961087/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/2046019/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/3990648/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/86204/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/60879/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/7036558/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/6773411/', NULL, 'quocvietpham185@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/66325/', 'Social Marketing', 'khanhhadn9x@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();
INSERT INTO public.linkedin_groups (id, group_url, group_name, email_crawl, status, intent, industry, tier, team, icp, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.linkedin.com/groups/16223014/', 'Việc làm CNTT Đà Nẵng', 'lnquynh.digitalmkt.work@gmail.com', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = COALESCE(EXCLUDED.group_name, public.linkedin_groups.group_name), email_crawl = EXCLUDED.email_crawl, updated_at = NOW();

-- 6. CHÈN DỮ LIỆU BẢNG: public.linkedin_posts
ALTER TABLE public.linkedin_posts DROP CONSTRAINT IF EXISTS unique_linkedin_post_url;
ALTER TABLE public.linkedin_posts ADD CONSTRAINT unique_linkedin_post_url UNIQUE (post_url);
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_5874469154247', 'ngminhhoang0934@gmail.com', '2026-05-16'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461317452916924416/', 'ANGSHU MAN PAL', 'The Indian Government initiated the development of a universal digital addressing system to address the limitations of traditional addresses, which are often inconsistent or incomplete in the country''s diverse landscape. Approved in 2022 with involvement from agencies like India Post, ISRO, and UIDAI, the system aims to utilize geospatial technology to create precise, privacy-preserving digital addresses. These addresses would function as unique virtual identifiers, similar to UPI or Aadhaar numbers, facilitating secure and efficient communication of location information across digital platforms for individuals and businesses alike.

https://lnkd.in/gQydv3_C', 2, 0, 0, '2026-05-16T08:16:04.155800'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_5874469154247', 'ngminhhoang0934@gmail.com', '2026-05-16'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7460631561827323904/', 'Youcef Slimani', 'Most “culture problems” in engineering are just process debt nobody wants to refactor.



What it usually looks like in practice:

👉 “Anonymous feedback” that isn’t really anonymous → people still filter what they say


👉 “Transparency” that turns into noise → too many updates, not enough clarity


👉 Meetings replacing decisions → things that should be async get calendarized


👉 “Agile” turning into ceremony overhead → standups, rituals, but no real flow improvement


👉 Metrics replacing reality → tracking activity instead of shipping impact


👉 Burnout rebranded as “ownership” → overtime becomes default


👉 Blame hiding inside “postmortems” → symptoms discussed, root causes avoided


👉 Buzzword-driven management → you translate the message before you can act on it.



 So how you deal with those situations in your entreprise if they exist ?', 508, 1, 0, '2026-05-15T09:17:33.781687'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_2504727172768', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461984824027815936/', 'Rajiv (Raj) Nair', 'What many enterprises still call “operations” today is often just experienced people manually holding together gaps between systems, teams, counterparties, and decisions.

AI will accelerate many things, but it will also expose how much value, speed, capacity, and growth still sit trapped behind human coordination and outdated operating models.', 0, 0, 0, '2026-05-18T03:44:09.970138'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_2504727172768', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461973862948175873/', 'Sanjay Nandakumar', '🤔 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 𝐯𝐬. 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐰𝐡𝐢𝐜𝐡 𝐨𝐧𝐞 𝐬𝐡𝐨𝐮𝐥𝐝 𝐲𝐨𝐮 𝐮𝐬𝐞?

This is one of the most common questions I get from aspiring data scientists, and the answer is simpler than you think!

First, let''s understand why encoding matters at all 👇
Computers understand numbers, not words. So when your dataset has categories like 𝐀𝐩𝐩𝐥𝐞", "𝐁𝐚𝐧𝐚𝐧𝐚", 𝐨𝐫 "𝐎𝐫𝐚𝐧𝐠𝐞" — you need to convert them into numbers before feeding them to a model. That''s where encoding comes in.

Now, there are two popular ways to do this:

✅ 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐦𝐚𝐭𝐭𝐞𝐫𝐬
Assigns a unique number to each category.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐒𝐡𝐢𝐫𝐭 𝐒𝐢𝐳𝐞𝐬 → 𝐒𝐦𝐚𝐥𝐥 = 0, 𝐌𝐞𝐝𝐢𝐮𝐦 = 1, 𝐋𝐚𝐫𝐠𝐞 = 2
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐄𝐱𝐚𝐦 𝐆𝐫𝐚𝐝𝐞𝐬 → 𝐏𝐨𝐨𝐫 = 0, 𝐆𝐨𝐨𝐝 = 1, 𝐄𝐱𝐜𝐞𝐥𝐥𝐞𝐧𝐭 = 2
Perfect when there''s a natural rank or hierarchy in the data.

✅ 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐝𝐨𝐞𝐬 𝐍𝐎𝐓 𝐦𝐚𝐭𝐭𝐞𝐫
Creates a separate column for each category with 0s and 1s.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐏𝐞𝐭 𝐓𝐲𝐩𝐞𝐬 → 𝐃𝐨𝐠 = [1,0,0], 𝐂𝐚𝐭 = [0,1,0], 𝐁𝐢𝐫𝐝 = [0,0,1]
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐂𝐨𝐥𝐨𝐫𝐬, 𝐂𝐢𝐭𝐢𝐞𝐬, 𝐓𝐫𝐚𝐧𝐬𝐩𝐨𝐫𝐭 𝐓𝐲𝐩𝐞𝐬
No false relationships. No wrong assumptions.

⚠️ 𝐓𝐡𝐞 𝐃𝐚𝐧𝐠𝐞𝐫 𝐨𝐟 𝐖𝐫𝐨𝐧𝐠 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠:
If you use Label Encoding on fruits — Apple = 0, Orange = 1, Banana = 2 — your model might assume Banana > Orange > Apple, which is completely meaningless and can hurt your model''s performance!

Quick Decision Rule:
👉 𝑫𝒐𝒆𝒔 𝒐𝒓𝒅𝒆𝒓 𝒎𝒂𝒕𝒕𝒆𝒓? → 𝑳𝒂𝒃𝒆𝒍 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑵𝒐 𝒐𝒓𝒅𝒆𝒓? → 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑻𝒐𝒐 𝒎𝒂𝒏𝒚 𝒄𝒂𝒕𝒆𝒈𝒐𝒓𝒊𝒆𝒔? → 𝑪𝒐𝒏𝒔𝒊𝒅𝒆𝒓 𝑻𝒂𝒓𝒈𝒆𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑪𝒐𝒏𝒇𝒖𝒔𝒆𝒅? → 𝑫𝒆𝒇𝒂𝒖𝒍𝒕 𝒕𝒐 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈 𝒕𝒐 𝒃𝒆 𝒔𝒂𝒇𝒆!

I''ve put together a beginner-friendly visual guide covering all of this — with real-world examples, pros & cons of each method, and the math behind both. Check it out in the PDF attached below!


hashtag
#DataScience 
hashtag
#MachineLearning 
hashtag
#FeatureEngineering 
hashtag
#AI 
hashtag
#DataPreprocessing 
hashtag
#MLTips 
hashtag
#LabelEncoding 
hashtag
#OneHotEncoding 
hashtag
#DataScientist 
hashtag
#AIMLEngineer 
hashtag
#ArtificialIntelligence 
hashtag
#Deeplearning 
hashtag
#NLP 
hashtag
#NaturalLanguageProcessing 
hashtag
#Data 
hashtag
#Analytics 
hashtag
#DataEngineering 
hashtag
#Statistics 
hashtag
#Cloud', 22, 2, 0, '2026-05-18T03:00:45.060136'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_9863343159603', 'kangtaeoh112001@gmail.com', '2026-05-18'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461995893328883712/', 'Simran Kalra', 'Hello Everyone

We are looking for an experienced Operations or Senior Operations Executive for B2B LTL shipments

Location - Gurugram
Salary - based on experience
Requirements - min 1 year of experience

Kindly share your resume at hr@shipmozo.com


hashtag
#operations 
hashtag
#b2bshipment 
hashtag
#b2bshipments 
hashtag
#LTLshipments 
hashtag
#operationsvacany 
hashtag
#senioroperations 
hashtag
#operationsexecutive 
hashtag
#operationshiring', 2, 0, 0, '2026-05-18T04:28:11.483353'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_9863343159603', 'kangtaeoh112001@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461973862948175873/', 'Sanjay Nandakumar', '🤔 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 𝐯𝐬. 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐰𝐡𝐢𝐜𝐡 𝐨𝐧𝐞 𝐬𝐡𝐨𝐮𝐥𝐝 𝐲𝐨𝐮 𝐮𝐬𝐞?

This is one of the most common questions I get from aspiring data scientists, and the answer is simpler than you think!

First, let''s understand why encoding matters at all 👇
Computers understand numbers, not words. So when your dataset has categories like 𝐀𝐩𝐩𝐥𝐞", "𝐁𝐚𝐧𝐚𝐧𝐚", 𝐨𝐫 "𝐎𝐫𝐚𝐧𝐠𝐞" — you need to convert them into numbers before feeding them to a model. That''s where encoding comes in.

Now, there are two popular ways to do this:

✅ 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐦𝐚𝐭𝐭𝐞𝐫𝐬
Assigns a unique number to each category.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐒𝐡𝐢𝐫𝐭 𝐒𝐢𝐳𝐞𝐬 → 𝐒𝐦𝐚𝐥𝐥 = 0, 𝐌𝐞𝐝𝐢𝐮𝐦 = 1, 𝐋𝐚𝐫𝐠𝐞 = 2
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐄𝐱𝐚𝐦 𝐆𝐫𝐚𝐝𝐞𝐬 → 𝐏𝐨𝐨𝐫 = 0, 𝐆𝐨𝐨𝐝 = 1, 𝐄𝐱𝐜𝐞𝐥𝐥𝐞𝐧𝐭 = 2
Perfect when there''s a natural rank or hierarchy in the data.

✅ 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐝𝐨𝐞𝐬 𝐍𝐎𝐓 𝐦𝐚𝐭𝐭𝐞𝐫
Creates a separate column for each category with 0s and 1s.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐏𝐞𝐭 𝐓𝐲𝐩𝐞𝐬 → 𝐃𝐨𝐠 = [1,0,0], 𝐂𝐚𝐭 = [0,1,0], 𝐁𝐢𝐫𝐝 = [0,0,1]
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐂𝐨𝐥𝐨𝐫𝐬, 𝐂𝐢𝐭𝐢𝐞𝐬, 𝐓𝐫𝐚𝐧𝐬𝐩𝐨𝐫𝐭 𝐓𝐲𝐩𝐞𝐬
No false relationships. No wrong assumptions.

⚠️ 𝐓𝐡𝐞 𝐃𝐚𝐧𝐠𝐞𝐫 𝐨𝐟 𝐖𝐫𝐨𝐧𝐠 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠:
If you use Label Encoding on fruits — Apple = 0, Orange = 1, Banana = 2 — your model might assume Banana > Orange > Apple, which is completely meaningless and can hurt your model''s performance!

Quick Decision Rule:
👉 𝑫𝒐𝒆𝒔 𝒐𝒓𝒅𝒆𝒓 𝒎𝒂𝒕𝒕𝒆𝒓? → 𝑳𝒂𝒃𝒆𝒍 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑵𝒐 𝒐𝒓𝒅𝒆𝒓? → 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑻𝒐𝒐 𝒎𝒂𝒏𝒚 𝒄𝒂𝒕𝒆𝒈𝒐𝒓𝒊𝒆𝒔? → 𝑪𝒐𝒏𝒔𝒊𝒅𝒆𝒓 𝑻𝒂𝒓𝒈𝒆𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑪𝒐𝒏𝒇𝒖𝒔𝒆𝒅? → 𝑫𝒆𝒇𝒂𝒖𝒍𝒕 𝒕𝒐 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈 𝒕𝒐 𝒃𝒆 𝒔𝒂𝒇𝒆!

I''ve put together a beginner-friendly visual guide covering all of this — with real-world examples, pros & cons of each method, and the math behind both. Check it out in the PDF attached below!


hashtag
#DataScience 
hashtag
#MachineLearning 
hashtag
#FeatureEngineering 
hashtag
#AI 
hashtag
#DataPreprocessing 
hashtag
#MLTips 
hashtag
#LabelEncoding 
hashtag
#OneHotEncoding 
hashtag
#DataScientist 
hashtag
#AIMLEngineer 
hashtag
#ArtificialIntelligence 
hashtag
#Deeplearning 
hashtag
#NLP 
hashtag
#NaturalLanguageProcessing 
hashtag
#Data 
hashtag
#Analytics 
hashtag
#DataEngineering 
hashtag
#Statistics 
hashtag
#Cloud', 11, 0, 0, '2026-05-18T03:29:53.282237'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_5534553265987', 'kangtaeoh112001@gmail.com', '2026-05-18'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461995893328883712/', 'Simran Kalra', 'Hello Everyone

We are looking for an experienced Operations or Senior Operations Executive for B2B LTL shipments

Location - Gurugram
Salary - based on experience
Requirements - min 1 year of experience

Kindly share your resume at hr@shipmozo.com


hashtag
#operations 
hashtag
#b2bshipment 
hashtag
#b2bshipments 
hashtag
#LTLshipments 
hashtag
#operationsvacany 
hashtag
#senioroperations 
hashtag
#operationsexecutive 
hashtag
#operationshiring', 2, 0, 0, '2026-05-18T04:37:52.225296'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_5534553265987', 'kangtaeoh112001@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7461973862948175873/', 'Sanjay Nandakumar', '🤔 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 𝐯𝐬. 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐰𝐡𝐢𝐜𝐡 𝐨𝐧𝐞 𝐬𝐡𝐨𝐮𝐥𝐝 𝐲𝐨𝐮 𝐮𝐬𝐞?

This is one of the most common questions I get from aspiring data scientists, and the answer is simpler than you think!

First, let''s understand why encoding matters at all 👇
Computers understand numbers, not words. So when your dataset has categories like 𝐀𝐩𝐩𝐥𝐞", "𝐁𝐚𝐧𝐚𝐧𝐚", 𝐨𝐫 "𝐎𝐫𝐚𝐧𝐠𝐞" — you need to convert them into numbers before feeding them to a model. That''s where encoding comes in.

Now, there are two popular ways to do this:

✅ 𝐋𝐚𝐛𝐞𝐥 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐦𝐚𝐭𝐭𝐞𝐫𝐬
Assigns a unique number to each category.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐒𝐡𝐢𝐫𝐭 𝐒𝐢𝐳𝐞𝐬 → 𝐒𝐦𝐚𝐥𝐥 = 0, 𝐌𝐞𝐝𝐢𝐮𝐦 = 1, 𝐋𝐚𝐫𝐠𝐞 = 2
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐄𝐱𝐚𝐦 𝐆𝐫𝐚𝐝𝐞𝐬 → 𝐏𝐨𝐨𝐫 = 0, 𝐆𝐨𝐨𝐝 = 1, 𝐄𝐱𝐜𝐞𝐥𝐥𝐞𝐧𝐭 = 2
Perfect when there''s a natural rank or hierarchy in the data.

✅ 𝐎𝐧𝐞-𝐇𝐨𝐭 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠 — 𝐖𝐡𝐞𝐧 𝐨𝐫𝐝𝐞𝐫 𝐝𝐨𝐞𝐬 𝐍𝐎𝐓 𝐦𝐚𝐭𝐭𝐞𝐫
Creates a separate column for each category with 0s and 1s.
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐏𝐞𝐭 𝐓𝐲𝐩𝐞𝐬 → 𝐃𝐨𝐠 = [1,0,0], 𝐂𝐚𝐭 = [0,1,0], 𝐁𝐢𝐫𝐝 = [0,0,1]
📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞: 𝐂𝐨𝐥𝐨𝐫𝐬, 𝐂𝐢𝐭𝐢𝐞𝐬, 𝐓𝐫𝐚𝐧𝐬𝐩𝐨𝐫𝐭 𝐓𝐲𝐩𝐞𝐬
No false relationships. No wrong assumptions.

⚠️ 𝐓𝐡𝐞 𝐃𝐚𝐧𝐠𝐞𝐫 𝐨𝐟 𝐖𝐫𝐨𝐧𝐠 𝐄𝐧𝐜𝐨𝐝𝐢𝐧𝐠:
If you use Label Encoding on fruits — Apple = 0, Orange = 1, Banana = 2 — your model might assume Banana > Orange > Apple, which is completely meaningless and can hurt your model''s performance!

Quick Decision Rule:
👉 𝑫𝒐𝒆𝒔 𝒐𝒓𝒅𝒆𝒓 𝒎𝒂𝒕𝒕𝒆𝒓? → 𝑳𝒂𝒃𝒆𝒍 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑵𝒐 𝒐𝒓𝒅𝒆𝒓? → 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑻𝒐𝒐 𝒎𝒂𝒏𝒚 𝒄𝒂𝒕𝒆𝒈𝒐𝒓𝒊𝒆𝒔? → 𝑪𝒐𝒏𝒔𝒊𝒅𝒆𝒓 𝑻𝒂𝒓𝒈𝒆𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈
👉 𝑪𝒐𝒏𝒇𝒖𝒔𝒆𝒅? → 𝑫𝒆𝒇𝒂𝒖𝒍𝒕 𝒕𝒐 𝑶𝒏𝒆-𝑯𝒐𝒕 𝑬𝒏𝒄𝒐𝒅𝒊𝒏𝒈 𝒕𝒐 𝒃𝒆 𝒔𝒂𝒇𝒆!

I''ve put together a beginner-friendly visual guide covering all of this — with real-world examples, pros & cons of each method, and the math behind both. Check it out in the PDF attached below!


hashtag
#DataScience 
hashtag
#MachineLearning 
hashtag
#FeatureEngineering 
hashtag
#AI 
hashtag
#DataPreprocessing 
hashtag
#MLTips 
hashtag
#LabelEncoding 
hashtag
#OneHotEncoding 
hashtag
#DataScientist 
hashtag
#AIMLEngineer 
hashtag
#ArtificialIntelligence 
hashtag
#Deeplearning 
hashtag
#NLP 
hashtag
#NaturalLanguageProcessing 
hashtag
#Data 
hashtag
#Analytics 
hashtag
#DataEngineering 
hashtag
#Statistics 
hashtag
#Cloud', 11, 0, 0, '2026-05-18T03:38:35.395447'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7357530146966', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7459844819381755904/', 'Unknown author', 'Every time you type a sentence like “The cat sat on the…”

A language model doesn’t “know” what a cat is. And it also doesn’t “know” which word should come next. It just calculates probabilities.

“mat” > high probability
“moon” > lower probability
“missile’ > very low probability 

But behind the scenes, it’s doing something fascinating:

• Turning words into numbers (embeddings)
• Comparing them using attention (what matters most?)
• Assigning relevance scores
• Combining everything into a prediction for the next token

Then it repeats this again and again, building full ✍️ sentences, 🗒️ paragraphs, 💡ideas. This is not just auto-complete on steroids. It’s the foundation of:

• ChatGPT-style conversations
• Code generation
• AI copilots
• Translation systems
• Content creation tools

All emerging from one core 🔁 loop: given context > predict what comes next.
When trained on massive datasets, this “simple” mechanism starts to:

• Mimic reasoning
• Capture tone and style
• Generate creative ideas
• Even appear to “understand” context

Not because it thinks. But because it has seen patterns at scale.

This is intelligence-like behavior based on probability distributions. Do you think next-token prediction alone can get us to true intelligence? Or are we missing a fundamental 🧩 piece?', 0, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_5827698649426', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462088262770331648/', 'Sharon AC', 'India is witnessing a massive rise in first-time investors and traders.
But quality financial education still remains fragmented, complex, unstructured and often limited by language barriers.

At Aineura, we are building FnKnowBot — an AI-powered Multi-Lingual Personal Finance Learning Platform designed to democratize financial literacy across India and beyond. 🚀

FnKnowBot enables learners to understand practical personal finance concepts in their own language through conversational AI and structured pre-built questions across a wide spectrum of topics, including:
📈 Stock Market Investing
🌍 Foreign Equities
💰 Mutual Funds, Bonds, REITs & Crypto
📊 Fundamental & Technical Analysis
📉 Trading & Risk Management
🏠 Real Estate & Property Buying
🛡 Financial Planning & Wealth Creation
👨‍👩‍👧 Succession & Estate Planning
🌴 Retirement Planning
…and much more.

Our vision is simple:
Every individual should have access to practical financial education in their heart language through AI.
Try FnKnowBot: https://fnknowbot.in

For enquiries:
📱 WhatsApp: +91 92 668 77 036
📧 Email: contact@fnknowbot.in

Aineura: https://aineura.in', 0, 0, 0, '2026-05-18T10:34:48.669414'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_5827698649426', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462070820702519296/', 'Zohaib Sattar', 'Fundamentals matter more than most people think.

I have worked on projects where linear regression outperformed XGBoost.

 Not because XGBoost is bad — because the relationship was simple and the simpler model generalised better.

If you are starting your data science journey, start here. 

These five algorithms cover the majority of real-world problems.

𝗟𝗶𝗻𝗲𝗮𝗿 𝗥𝗲𝗴𝗿𝗲𝘀𝘀𝗶𝗼𝗻 when you need to predict a number. Revenue, price, demand. The simplest model that works — and simple models are often the right ones.

𝗟𝗼𝗴𝗶𝘀𝘁𝗶𝗰 𝗥𝗲𝗴𝗿𝗲𝘀𝘀𝗶𝗼𝗻 when you need to predict a probability. Will this customer churn? Will this transaction be fraudulent? The output is a number between 0 and 1 that a business can actually act on.

𝗗𝗲𝗰𝗶𝘀𝗶𝗼𝗻 𝗧𝗿𝗲𝗲 when you need something explainable. A stakeholder who cannot read Python can follow a decision tree. That matters more than you think in a real organisation.

𝗥𝗮𝗻𝗱𝗼𝗺 𝗙𝗼𝗿𝗲𝘀𝘁 when you need accuracy and reliability. Multiple trees voting together. More robust than a single tree and handles messy real-world data well. My go-to for most classification problems.

𝗞-𝗠𝗲𝗮𝗻𝘀 𝗖𝗹𝘂𝘀𝘁𝗲𝗿𝗶𝗻𝗴 when you have no labels and need to find structure. Customer segmentation, anomaly detection, grouping similar behaviour. The algorithm finds patterns you did not know to look for.

Start with the simplest model that could work. Add complexity only when the simpler model is not good enough.

Save this for your next model.', 159, 11, 0, '2026-05-18T09:42:24.841521'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_3818715470357', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462088262770331648/', 'Sharon AC', 'India is witnessing a massive rise in first-time investors and traders.
But quality financial education still remains fragmented, complex, unstructured and often limited by language barriers.

At Aineura, we are building FnKnowBot — an AI-powered Multi-Lingual Personal Finance Learning Platform designed to democratize financial literacy across India and beyond. 🚀

FnKnowBot enables learners to understand practical personal finance concepts in their own language through conversational AI and structured pre-built questions across a wide spectrum of topics, including:
📈 Stock Market Investing
🌍 Foreign Equities
💰 Mutual Funds, Bonds, REITs & Crypto
📊 Fundamental & Technical Analysis
📉 Trading & Risk Management
🏠 Real Estate & Property Buying
🛡 Financial Planning & Wealth Creation
👨‍👩‍👧 Succession & Estate Planning
🌴 Retirement Planning
…and much more.

Our vision is simple:
Every individual should have access to practical financial education in their heart language through AI.
Try FnKnowBot: https://fnknowbot.in

For enquiries:
📱 WhatsApp: +91 92 668 77 036
📧 Email: contact@fnknowbot.in

Aineura: https://aineura.in', 0, 0, 0, '2026-05-18T10:49:54.417799'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_3818715470357', 'ngminhhoang0934@gmail.com', '2026-05-18'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462070820702519296/', 'Zohaib Sattar', 'Fundamentals matter more than most people think.

I have worked on projects where linear regression outperformed XGBoost.

 Not because XGBoost is bad — because the relationship was simple and the simpler model generalised better.

If you are starting your data science journey, start here. 

These five algorithms cover the majority of real-world problems.

𝗟𝗶𝗻𝗲𝗮𝗿 𝗥𝗲𝗴𝗿𝗲𝘀𝘀𝗶𝗼𝗻 when you need to predict a number. Revenue, price, demand. The simplest model that works — and simple models are often the right ones.

𝗟𝗼𝗴𝗶𝘀𝘁𝗶𝗰 𝗥𝗲𝗴𝗿𝗲𝘀𝘀𝗶𝗼𝗻 when you need to predict a probability. Will this customer churn? Will this transaction be fraudulent? The output is a number between 0 and 1 that a business can actually act on.

𝗗𝗲𝗰𝗶𝘀𝗶𝗼𝗻 𝗧𝗿𝗲𝗲 when you need something explainable. A stakeholder who cannot read Python can follow a decision tree. That matters more than you think in a real organisation.

𝗥𝗮𝗻𝗱𝗼𝗺 𝗙𝗼𝗿𝗲𝘀𝘁 when you need accuracy and reliability. Multiple trees voting together. More robust than a single tree and handles messy real-world data well. My go-to for most classification problems.

𝗞-𝗠𝗲𝗮𝗻𝘀 𝗖𝗹𝘂𝘀𝘁𝗲𝗿𝗶𝗻𝗴 when you have no labels and need to find structure. Customer segmentation, anomaly detection, grouping similar behaviour. The algorithm finds patterns you did not know to look for.

Start with the simplest model that could work. Add complexity only when the simpler model is not good enough.

Save this for your next model.', 159, 11, 0, '2026-05-18T09:50:40.531373'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_1659062141250', 'kangtaeoh112001@gmail.com', '2026-05-19'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462317208141156352/', 'Chris R.', 'IT leaders are being asked to reduce infrastructure cost while operational complexity continues growing every quarter.

More cloud spend.

More licenses.
More workloads.
More operational noise.

Yet many organizations still cannot clearly identify what is actually driving the cost underneath.

Recurring anomalies.
Overprovisioned environments.
Inefficient workloads.
Slow root cause analysis.

The issue is no longer monitoring.

The issue is visibility into operational waste before infrastructure and cloud spend continue scaling around it.

This is where AI-driven operational intelligence is starting to change the conversation.


hashtag
#DatabaseTooling 
hashtag
#ToolFatigue 
hashtag
#Observability 
hashtag
#ITLeadership 
hashtag
#FinOps 
hashtag
#ScalingChallenges 
hashtag
#DatabaseMonitoring 
hashtag
#CloudOps', 0, 0, 0, '2026-05-19T01:44:25.569664'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'kangtaeoh112001_1659062141250', 'kangtaeoh112001@gmail.com', '2026-05-19'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7459844819381755904/', 'Robbert van Vlijmen', 'Every time you type a sentence like “The cat sat on the…”

A language model doesn’t “know” what a cat is. And it also doesn’t “know” which word should come next. It just calculates probabilities.

“mat” > high probability
“moon” > lower probability
“missile’ > very low probability 

But behind the scenes, it’s doing something fascinating:

• Turning words into numbers (embeddings)
• Comparing them using attention (what matters most?)
• Assigning relevance scores
• Combining everything into a prediction for the next token

Then it repeats this again and again, building full ✍️ sentences, 🗒️ paragraphs, 💡ideas. This is not just auto-complete on steroids. It’s the foundation of:

• ChatGPT-style conversations
• Code generation
• AI copilots
• Translation systems
• Content creation tools

All emerging from one core 🔁 loop: given context > predict what comes next.
When trained on massive datasets, this “simple” mechanism starts to:

• Mimic reasoning
• Capture tone and style
• Generate creative ideas
• Even appear to “understand” context

Not because it thinks. But because it has seen patterns at scale.

This is intelligence-like behavior based on probability distributions. Do you think next-token prediction alone can get us to true intelligence? Or are we missing a fundamental 🧩 piece?', 192, 0, 0, '2026-05-13T02:02:14.970269'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_4748430575920', 'ngminhhoang0934@gmail.com', '2026-05-19'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462329768278122497/', 'Jenifer Caridad', '𝐉𝐨𝐢𝐧 𝐭𝐡𝐞 𝐖𝐢𝐥𝐥𝐢𝐚 𝐄𝐬𝐭𝐚𝐭𝐞 𝐓𝐞𝐚𝐦: 𝐄𝐥𝐞𝐯𝐚𝐭𝐞 𝐘𝐨𝐮𝐫 𝐂𝐚𝐫𝐞𝐞𝐫 𝐚𝐬 𝐚 𝐅𝐢𝐧𝐚𝐧𝐜𝐢𝐚𝐥 𝐀𝐝𝐯𝐢𝐬𝐨𝐫! 🚀

Want a career with limitless growth potential? At Willia Estate, we empower you to reach your highest professional goals while making a meaningful, lasting difference in people’s lives.

We are looking for driven, ambitious individuals to join our team as Financial Advisors. If you are ready to take control of your professional journey and thrive in a dynamic environment, this opportunity is for you.

Ready to level up?

Don''t just look for a job—invest in a career. Come and be part of the Willia Estate success story!

Apply Now! send your updated CV to jenifer.c@williaestate.com


hashtag
#WilliaEstate 
hashtag
#FinancialAdvisor 
hashtag
#CareerGrowth 
hashtag
#Hiring 
hashtag
#FinanceJobs 
hashtag
#JoinOurTeam 
hashtag
#Recruiter', 3, 1, 0, '2026-05-19T02:34:59.139294'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ngminhhoang0934_4748430575920', 'ngminhhoang0934@gmail.com', '2026-05-19'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462121859229118464/', 'Daniel Zaldaña', 'Speed without judgment can turn a good tool into a poor business decision.
The instruction was to paint the fence, but the AI interpreted the visible pattern and ended up creating something that looked like a barcode. It executed quickly. It followed a logic. It produced a consistent result.
But it moved away from the real need.

A large language model or LLM, is trained to recognize patterns across large volumes of information. It learns relationships between words, contexts, behaviors, and signals. In simple terms, it identifies what usually comes next, what resembles what, and which response seems most likely based on the available data.

For that to create value, it needs a clear definition of the problem, business context, and success criteria.

That is where leadership comes in.

A team can ask AI to analyze customer reviews and receive a summary of frequent complaints in minutes. That is execution.

But the business decision appears when someone asks: are these complaints related to price, availability, commercial promise, in-store training, or digital experience?

The difference changes the action.

If the issue is availability, the decision may be to adjust inventory by store. If the issue is communication, it may be to correct the product description. If the issue is service, it may be to redesign the customer service protocol. The same analysis can lead to different decisions depending on the diagnosis.

In retail, using AI only to speed up tasks can create faster reports, more visually appealing dashboards, or more frequent campaigns. Using it with leadership can help better prioritize assortment, promotions, pricing, inventory, and customer experience.

Key question for leaders: before asking AI to execute, have we already defined which business problem we want to understand?

Because in decision-making, the quality of judgment matters as much as the speed of execution.

In which retail processes do you see the greatest risk of teams painting barcodes instead of solving the right problem?


Follow 👉 Daniel Zaldaña to explore more about AI and data science.



hashtag
#AI

hashtag
#ArtificialIntelligence

hashtag
#DataScience', 720, 22, 0, '2026-05-18T13:39:22.542191'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_4187794988745', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-19'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7459844819381755904/', 'Unknown author', 'Every time you type a sentence like “The cat sat on the…”

A language model doesn’t “know” what a cat is. And it also doesn’t “know” which word should come next. It just calculates probabilities.

“mat” > high probability
“moon” > lower probability
“missile’ > very low probability 

But behind the scenes, it’s doing something fascinating:

• Turning words into numbers (embeddings)
• Comparing them using attention (what matters most?)
• Assigning relevance scores
• Combining everything into a prediction for the next token

Then it repeats this again and again, building full ✍️ sentences, 🗒️ paragraphs, 💡ideas. This is not just auto-complete on steroids. It’s the foundation of:

• ChatGPT-style conversations
• Code generation
• AI copilots
• Translation systems
• Content creation tools

All emerging from one core 🔁 loop: given context > predict what comes next.
When trained on massive datasets, this “simple” mechanism starts to:

• Mimic reasoning
• Capture tone and style
• Generate creative ideas
• Even appear to “understand” context

Not because it thinks. But because it has seen patterns at scale.

This is intelligence-like behavior based on probability distributions. Do you think next-token prediction alone can get us to true intelligence? Or are we missing a fundamental 🧩 piece?', 0, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_6886358186981', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-19'::DATE, 'AI & Machine Learning Community (moderated)', 'https://www.linkedin.com/groups/961087/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462234789928955904/', 'Unknown author', 'GitHub isn’t just a place to store code.it’s where collaboration, innovation, and shared ideas come together to build better software.


Less known Github features:

👉 Open source discovery : explore and learn from millions of public projects


👉 GitHub Actions : automate testing, builds, and deployments


👉 GitHub Pages : host websites directly from your repository


👉 Gists : quickly share snippets of code or notes


👉 Project boards : organize tasks visually like a Kanban board


👉 Discussions : collaborate beyond code with community conversations


👉 Security alerts : get notified about vulnerabilities in your code


👉 Dependabot : automatically update dependencies


👉 Codespaces : cloud-based dev environment, code from anywhere', 939, 10, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_6068744175548', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462863910820339713/', 'Unknown author', '🚀 Just Created a Complete “Claude Commands” Cheat Sheet!

I designed this high-quality visual guide to make working with Claude AI easier, faster, and more productive. From writing prompts to coding, research, automation, planning, and productivity this infographic covers a wide range of useful Claude commands in one place.

💡 What’s included?
✔ Thinking & Reasoning Commands
✔ Writing & Content Commands
✔ Code & Development Commands
✔ Research & Learning Commands
✔ Planning & Productivity Commands
✔ Business & Career Commands
✔ Creative & Ideation Commands
✔ Communication & Utility Commands

This is especially useful for:
🔹 Data Analysts
🔹 Developers
🔹 AI Enthusiasts
🔹 Content Creators
🔹 Students & Professionals

AI tools become much more powerful when you know how to communicate with them effectively. Prompt engineering and command structuring are becoming essential skills in today’s tech-driven world.

📌 Save this post for future reference
📌 Share it with your network
📌 Follow me for more content on:
Excel • Power BI • SQL • Python • Reporting Automation • AI Tools

✍️ Created by Mohan Nayak 


hashtag
#ClaudeAI 
hashtag
#ArtificialIntelligence 
hashtag
#PromptEngineering 
hashtag
#AI 
hashtag
#Automation 
hashtag
#DataAnalytics 
hashtag
#Python 
hashtag
#SQL 
hashtag
#PowerBI 
hashtag
#Excel 
hashtag
#Productivity 
hashtag
#Tech 
hashtag
#Learning 
hashtag
#GenerativeAI 
hashtag
#AItools', 30, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_6068744175548', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_5481090124486', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463182306870968321/', 'Unknown author', '📢 Nestlé Pakistan is Hiring – Accounting Operations & Reporting Manager 🇵🇰
Looking to grow your career with one of the world’s leading FMCG companies? 🌍
 Nestlé Pakistan is seeking an experienced Accounting Operations & Reporting Manager for its Head Office team.
💼 Key Highlights:
 ✔️ Lead Period End Close (PEC) & financial reporting
 ✔️ Ensure IFRS & regulatory compliance
 ✔️ Manage audits, statutory reporting & balance sheet integrity
 ✔️ Work with SAP FICO, CAPEX & Fixed Assets processes
 ✔️ Collaborate with cross-functional finance teams
🎯 Requirements:
 ✅ ACA / ACCA / Finance or Accounting graduate
 ✅ 6–7 years of post-qualification experience
 ✅ Strong command of IFRS, IAS & corporate governance
 ✅ Advanced Excel & SAP FICO expertise
 ✅ Excellent communication & stakeholder management skills
 APPLY NOW 👇 
 https://lnkd.in/d_vQXhFR', 30, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_5481090124486', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462863910820339713/', 'Unknown author', '🚀 Just Created a Complete “Claude Commands” Cheat Sheet!

I designed this high-quality visual guide to make working with Claude AI easier, faster, and more productive. From writing prompts to coding, research, automation, planning, and productivity this infographic covers a wide range of useful Claude commands in one place.

💡 What’s included?
✔ Thinking & Reasoning Commands
✔ Writing & Content Commands
✔ Code & Development Commands
✔ Research & Learning Commands
✔ Planning & Productivity Commands
✔ Business & Career Commands
✔ Creative & Ideation Commands
✔ Communication & Utility Commands

This is especially useful for:
🔹 Data Analysts
🔹 Developers
🔹 AI Enthusiasts
🔹 Content Creators
🔹 Students & Professionals

AI tools become much more powerful when you know how to communicate with them effectively. Prompt engineering and command structuring are becoming essential skills in today’s tech-driven world.

📌 Save this post for future reference
📌 Share it with your network
📌 Follow me for more content on:
Excel • Power BI • SQL • Python • Reporting Automation • AI Tools

✍️ Created by Mohan Nayak 


hashtag
#ClaudeAI 
hashtag
#ArtificialIntelligence 
hashtag
#PromptEngineering 
hashtag
#AI 
hashtag
#Automation 
hashtag
#DataAnalytics 
hashtag
#Python 
hashtag
#SQL 
hashtag
#PowerBI 
hashtag
#Excel 
hashtag
#Productivity 
hashtag
#Tech 
hashtag
#Learning 
hashtag
#GenerativeAI 
hashtag
#AItools', 30, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_5481090124486', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7148867078614', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463182306870968321/', 'Unknown author', '📢 Nestlé Pakistan is Hiring – Accounting Operations & Reporting Manager 🇵🇰
Looking to grow your career with one of the world’s leading FMCG companies? 🌍
 Nestlé Pakistan is seeking an experienced Accounting Operations & Reporting Manager for its Head Office team.
💼 Key Highlights:
 ✔️ Lead Period End Close (PEC) & financial reporting
 ✔️ Ensure IFRS & regulatory compliance
 ✔️ Manage audits, statutory reporting & balance sheet integrity
 ✔️ Work with SAP FICO, CAPEX & Fixed Assets processes
 ✔️ Collaborate with cross-functional finance teams
🎯 Requirements:
 ✅ ACA / ACCA / Finance or Accounting graduate
 ✅ 6–7 years of post-qualification experience
 ✅ Strong command of IFRS, IAS & corporate governance
 ✅ Advanced Excel & SAP FICO expertise
 ✅ Excellent communication & stakeholder management skills
 APPLY NOW 👇 
 https://lnkd.in/d_vQXhFR', 31, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7148867078614', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462863910820339713/', 'Unknown author', '🚀 Just Created a Complete “Claude Commands” Cheat Sheet!

I designed this high-quality visual guide to make working with Claude AI easier, faster, and more productive. From writing prompts to coding, research, automation, planning, and productivity this infographic covers a wide range of useful Claude commands in one place.

💡 What’s included?
✔ Thinking & Reasoning Commands
✔ Writing & Content Commands
✔ Code & Development Commands
✔ Research & Learning Commands
✔ Planning & Productivity Commands
✔ Business & Career Commands
✔ Creative & Ideation Commands
✔ Communication & Utility Commands

This is especially useful for:
🔹 Data Analysts
🔹 Developers
🔹 AI Enthusiasts
🔹 Content Creators
🔹 Students & Professionals

AI tools become much more powerful when you know how to communicate with them effectively. Prompt engineering and command structuring are becoming essential skills in today’s tech-driven world.

📌 Save this post for future reference
📌 Share it with your network
📌 Follow me for more content on:
Excel • Power BI • SQL • Python • Reporting Automation • AI Tools

✍️ Created by Mohan Nayak 


hashtag
#ClaudeAI 
hashtag
#ArtificialIntelligence 
hashtag
#PromptEngineering 
hashtag
#AI 
hashtag
#Automation 
hashtag
#DataAnalytics 
hashtag
#Python 
hashtag
#SQL 
hashtag
#PowerBI 
hashtag
#Excel 
hashtag
#Productivity 
hashtag
#Tech 
hashtag
#Learning 
hashtag
#GenerativeAI 
hashtag
#AItools', 30, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7148867078614', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_9143222201540', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463182306870968321/', 'Unknown author', '📢 Nestlé Pakistan is Hiring – Accounting Operations & Reporting Manager 🇵🇰
Looking to grow your career with one of the world’s leading FMCG companies? 🌍
 Nestlé Pakistan is seeking an experienced Accounting Operations & Reporting Manager for its Head Office team.
💼 Key Highlights:
 ✔️ Lead Period End Close (PEC) & financial reporting
 ✔️ Ensure IFRS & regulatory compliance
 ✔️ Manage audits, statutory reporting & balance sheet integrity
 ✔️ Work with SAP FICO, CAPEX & Fixed Assets processes
 ✔️ Collaborate with cross-functional finance teams
🎯 Requirements:
 ✅ ACA / ACCA / Finance or Accounting graduate
 ✅ 6–7 years of post-qualification experience
 ✅ Strong command of IFRS, IAS & corporate governance
 ✅ Advanced Excel & SAP FICO expertise
 ✅ Excellent communication & stakeholder management skills
 APPLY NOW 👇 
 https://lnkd.in/d_vQXhFR', 32, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_9143222201540', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7462863910820339713/', 'Unknown author', '🚀 Just Created a Complete “Claude Commands” Cheat Sheet!

I designed this high-quality visual guide to make working with Claude AI easier, faster, and more productive. From writing prompts to coding, research, automation, planning, and productivity this infographic covers a wide range of useful Claude commands in one place.

💡 What’s included?
✔ Thinking & Reasoning Commands
✔ Writing & Content Commands
✔ Code & Development Commands
✔ Research & Learning Commands
✔ Planning & Productivity Commands
✔ Business & Career Commands
✔ Creative & Ideation Commands
✔ Communication & Utility Commands

This is especially useful for:
🔹 Data Analysts
🔹 Developers
🔹 AI Enthusiasts
🔹 Content Creators
🔹 Students & Professionals

AI tools become much more powerful when you know how to communicate with them effectively. Prompt engineering and command structuring are becoming essential skills in today’s tech-driven world.

📌 Save this post for future reference
📌 Share it with your network
📌 Follow me for more content on:
Excel • Power BI • SQL • Python • Reporting Automation • AI Tools

✍️ Created by Mohan Nayak 


hashtag
#ClaudeAI 
hashtag
#ArtificialIntelligence 
hashtag
#PromptEngineering 
hashtag
#AI 
hashtag
#Automation 
hashtag
#DataAnalytics 
hashtag
#Python 
hashtag
#SQL 
hashtag
#PowerBI 
hashtag
#Excel 
hashtag
#Productivity 
hashtag
#Tech 
hashtag
#Learning 
hashtag
#GenerativeAI 
hashtag
#AItools', 30, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_9143222201540', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_3145338768865', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-22'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463228158834561024/', 'Unknown author', '𝐎𝐎𝐏𝐒 𝐢𝐧 𝐏𝐲𝐭𝐡𝐨𝐧 𝐇𝐚𝐧𝐝𝐰𝐫𝐢𝐭𝐭𝐞𝐧 𝐍𝐨𝐭𝐞𝐬

To help you understand and apply OOP in Python effectively, we present "OOPS in Python Handwritten Notes (PDF)"—a comprehensive guide that provides detailed handwritten notes on OOP principles in Python.

𝐓𝐨 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐏𝐃𝐅 👇👇
https://lnkd.in/dNZ5UrCv


hashtag
#python 
hashtag
#pythonprogramming 
hashtag
#pythondevelopment 
hashtag
#programming 
hashtag
#programmer 
hashtag
#coding', 18, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_3079395040206', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463808433515933696/', 'Unknown author', 'I hope everyone is doing well and continuously learning in this fast-changing world of technology.
Data Science is evolving faster than ever — and 2026 is shaping up to be the era of AI-powered analytics.

One of the biggest shifts happening right now is the rise of AI Agents in data science workflows. These systems are no longer just assisting with coding; they are beginning to automate data cleaning, feature engineering, reporting, and even model experimentation.
This changes the role of a data scientist significantly.

The future is no longer about only building models — it’s about:
• Asking the right business questions
• Understanding data deeply
• Designing intelligent systems
• Communicating insights effectively
• Working alongside autonomous AI tools

Another important trend is the growing focus on data quality over model size. Organizations are realizing that better datasets often outperform bigger algorithms.
At the same time, responsible AI, governance, and explainability are becoming critical skills for every data professional.
The industry is clearly moving toward a future where:

👉 AI handles repetitive tasks
👉 Humans focus on strategy, creativity, and decision-making
For students and professionals in tech, this is the best time to strengthen 

skills in:
Python • Machine Learning • SQL • Cloud • MLOps • AI Governance • Business Analytics
Data Science is no longer just a technical field — it’s becoming the backbone of decision intelligence across industries.
Exciting times ahead. 🚀
What are your thoughts on the future of Data Science and AI?

hashtag
#DataScience 
hashtag
#ArtificialIntelligence 
hashtag
#MachineLearning 
hashtag
#AI 
hashtag
#Analytics 
hashtag
#Python 
hashtag
#BigData 
hashtag
#MLOps 
hashtag
#TechTrends 
hashtag
#DataAnalytics', 16, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_2133293012586', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463808433515933696/', 'Unknown author', 'I hope everyone is doing well and continuously learning in this fast-changing world of technology.
Data Science is evolving faster than ever — and 2026 is shaping up to be the era of AI-powered analytics.

One of the biggest shifts happening right now is the rise of AI Agents in data science workflows. These systems are no longer just assisting with coding; they are beginning to automate data cleaning, feature engineering, reporting, and even model experimentation.
This changes the role of a data scientist significantly.

The future is no longer about only building models — it’s about:
• Asking the right business questions
• Understanding data deeply
• Designing intelligent systems
• Communicating insights effectively
• Working alongside autonomous AI tools

Another important trend is the growing focus on data quality over model size. Organizations are realizing that better datasets often outperform bigger algorithms.
At the same time, responsible AI, governance, and explainability are becoming critical skills for every data professional.
The industry is clearly moving toward a future where:

👉 AI handles repetitive tasks
👉 Humans focus on strategy, creativity, and decision-making
For students and professionals in tech, this is the best time to strengthen 

skills in:
Python • Machine Learning • SQL • Cloud • MLOps • AI Governance • Business Analytics
Data Science is no longer just a technical field — it’s becoming the backbone of decision intelligence across industries.
Exciting times ahead. 🚀
What are your thoughts on the future of Data Science and AI?

hashtag
#DataScience 
hashtag
#ArtificialIntelligence 
hashtag
#MachineLearning 
hashtag
#AI 
hashtag
#Analytics 
hashtag
#Python 
hashtag
#BigData 
hashtag
#MLOps 
hashtag
#TechTrends 
hashtag
#DataAnalytics', 16, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_1187585168230', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463926943164547072/', 'Unknown author', 'If you wish to receive updates, kindly DM me to join the WA broadcast list.
 
A crisp, practical update designed to help professionals and businesses stay ahead in the ever-changing regulatory landscape.
 
🔎 What you get every week:
 
✅ Key updates in Income Tax, GST & Corporate Laws
✅ Practical insights you can actually apply
✅ Important judicial precedents & notifications
✅ Upcoming compliance due dates — so nothing slips through
 

hashtag
#RJRWeeklyBulletin 
hashtag
#TaxUpdates', 0, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_1187585168230', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463808433515933696/', 'Unknown author', 'I hope everyone is doing well and continuously learning in this fast-changing world of technology.
Data Science is evolving faster than ever — and 2026 is shaping up to be the era of AI-powered analytics.

One of the biggest shifts happening right now is the rise of AI Agents in data science workflows. These systems are no longer just assisting with coding; they are beginning to automate data cleaning, feature engineering, reporting, and even model experimentation.
This changes the role of a data scientist significantly.

The future is no longer about only building models — it’s about:
• Asking the right business questions
• Understanding data deeply
• Designing intelligent systems
• Communicating insights effectively
• Working alongside autonomous AI tools

Another important trend is the growing focus on data quality over model size. Organizations are realizing that better datasets often outperform bigger algorithms.
At the same time, responsible AI, governance, and explainability are becoming critical skills for every data professional.
The industry is clearly moving toward a future where:

👉 AI handles repetitive tasks
👉 Humans focus on strategy, creativity, and decision-making
For students and professionals in tech, this is the best time to strengthen 

skills in:
Python • Machine Learning • SQL • Cloud • MLOps • AI Governance • Business Analytics
Data Science is no longer just a technical field — it’s becoming the backbone of decision intelligence across industries.
Exciting times ahead. 🚀
What are your thoughts on the future of Data Science and AI?

hashtag
#DataScience 
hashtag
#ArtificialIntelligence 
hashtag
#MachineLearning 
hashtag
#AI 
hashtag
#Analytics 
hashtag
#Python 
hashtag
#BigData 
hashtag
#MLOps 
hashtag
#TechTrends 
hashtag
#DataAnalytics', 19, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_1187585168230', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_8128012806114', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463661681353838592/', 'Unknown author', 'Micro1 is hiring!

PUBLIC EQUITY INVESTMENT EXPERT

If you have deep knowledge of leveraged bonds, company debt, risk analysis, and public market dynamics, this is an opportunity to contribute your expertise to cutting-edge AI and financial intelligence initiatives.

Job type: Contract 
Location: Remote (Global)
Pay: USD $200 - $300/Hour

Required Skills:
-Debt modeling
-Risk analysis
-Company debt
-Capital structures
-Leveraged bonds/loans

Key Responsibilities:
-Leverage deep understanding of public equity markets to provide expert evaluation and nuanced feedback on investment scenarios.
-Analyze and critique company capital structures, focusing on the intricate interplay between equity, debt, and hybrid instruments.
-Utilize advanced debt modeling skills to dissect leveraged bonds and loans, identifying potential risks and opportunities.
-Assess risk profiles of public companies with a detailed eye for company debt and credit structures.
-Deliver structured, insightful written and verbal explanations that can inform and improve AI systems'' understanding of public equity investment dynamics.
-Collaborate closely with the customer''s team to ensure domain-specific knowledge is accurately captured and integrated.
-Contribute to the development of robust datasets and evaluation processes that reflect real-world financial complexity.

Qualifications:
-Proven expertise in public equity investments, with a strong focus on capital structures and debt instruments.
-In-depth experience with debt modeling and risk analysis in public markets.
-Comprehensive knowledge of company debt, leveraged bonds, and loan structures.
-Exceptional written and verbal communication skills, with the ability to convey complex financial concepts clearly.
-Strong analytical and quantitative abilities; able to synthesize data from multiple sources.
-Ability to work independently and as part of a distributed, remote team.
-Meticulous attention to detail in documentation and feedback provision.

Preferred Qualifications:
-Advanced degree in finance, economics, or a related field.
-Experience training or mentoring others on capital structure analysis or debt modeling.
-Prior exposure to AI, data annotation, or financial technology projects (a plus but not required

Details and apply:
https://lnkd.in/g-YWzrcR

⚠️ IMPORTANT:
Resume/CV will be screened by an ATS AI system. Qualified candidates will receive an AI Interview invitation via email. Please complete the interview promptly to support a faster recruitment process.


hashtag
#Hiring 
hashtag
#FinanceJobs 
hashtag
#InvestmentExpert 
hashtag
#PublicEquity 
hashtag
#DebtModeling 
hashtag
#RiskAnalysis 
hashtag
#CapitalStructure 
hashtag
#InvestmentBanking 
hashtag
#CreditAnalysis 
hashtag
#FinancialModeling 
hashtag
#RemoteJobs 
hashtag
#GlobalHiring 
hashtag
#FinanceCareers 
hashtag
#AssetManagement 
hashtag
#LeveragedFinance 
hashtag
#EquityResearch 
hashtag
#AIRecruitment 
hashtag
#NowHiring 
hashtag
#Fintech', 3, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_8128012806114', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463808433515933696/', 'Unknown author', 'I hope everyone is doing well and continuously learning in this fast-changing world of technology.
Data Science is evolving faster than ever — and 2026 is shaping up to be the era of AI-powered analytics.

One of the biggest shifts happening right now is the rise of AI Agents in data science workflows. These systems are no longer just assisting with coding; they are beginning to automate data cleaning, feature engineering, reporting, and even model experimentation.
This changes the role of a data scientist significantly.

The future is no longer about only building models — it’s about:
• Asking the right business questions
• Understanding data deeply
• Designing intelligent systems
• Communicating insights effectively
• Working alongside autonomous AI tools

Another important trend is the growing focus on data quality over model size. Organizations are realizing that better datasets often outperform bigger algorithms.
At the same time, responsible AI, governance, and explainability are becoming critical skills for every data professional.
The industry is clearly moving toward a future where:

👉 AI handles repetitive tasks
👉 Humans focus on strategy, creativity, and decision-making
For students and professionals in tech, this is the best time to strengthen 

skills in:
Python • Machine Learning • SQL • Cloud • MLOps • AI Governance • Business Analytics
Data Science is no longer just a technical field — it’s becoming the backbone of decision intelligence across industries.
Exciting times ahead. 🚀
What are your thoughts on the future of Data Science and AI?

hashtag
#DataScience 
hashtag
#ArtificialIntelligence 
hashtag
#MachineLearning 
hashtag
#AI 
hashtag
#Analytics 
hashtag
#Python 
hashtag
#BigData 
hashtag
#MLOps 
hashtag
#TechTrends 
hashtag
#DataAnalytics', 19, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_8128012806114', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7082655802716', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI, IT & Transformation in Accounting, Finance, Bank (Largest Professional technology group)', 'https://www.linkedin.com/groups/52007/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463661681353838592/', 'Unknown author', 'Micro1 is hiring!

PUBLIC EQUITY INVESTMENT EXPERT

If you have deep knowledge of leveraged bonds, company debt, risk analysis, and public market dynamics, this is an opportunity to contribute your expertise to cutting-edge AI and financial intelligence initiatives.

Job type: Contract 
Location: Remote (Global)
Pay: USD $200 - $300/Hour

Required Skills:
-Debt modeling
-Risk analysis
-Company debt
-Capital structures
-Leveraged bonds/loans

Key Responsibilities:
-Leverage deep understanding of public equity markets to provide expert evaluation and nuanced feedback on investment scenarios.
-Analyze and critique company capital structures, focusing on the intricate interplay between equity, debt, and hybrid instruments.
-Utilize advanced debt modeling skills to dissect leveraged bonds and loans, identifying potential risks and opportunities.
-Assess risk profiles of public companies with a detailed eye for company debt and credit structures.
-Deliver structured, insightful written and verbal explanations that can inform and improve AI systems'' understanding of public equity investment dynamics.
-Collaborate closely with the customer''s team to ensure domain-specific knowledge is accurately captured and integrated.
-Contribute to the development of robust datasets and evaluation processes that reflect real-world financial complexity.

Qualifications:
-Proven expertise in public equity investments, with a strong focus on capital structures and debt instruments.
-In-depth experience with debt modeling and risk analysis in public markets.
-Comprehensive knowledge of company debt, leveraged bonds, and loan structures.
-Exceptional written and verbal communication skills, with the ability to convey complex financial concepts clearly.
-Strong analytical and quantitative abilities; able to synthesize data from multiple sources.
-Ability to work independently and as part of a distributed, remote team.
-Meticulous attention to detail in documentation and feedback provision.

Preferred Qualifications:
-Advanced degree in finance, economics, or a related field.
-Experience training or mentoring others on capital structure analysis or debt modeling.
-Prior exposure to AI, data annotation, or financial technology projects (a plus but not required

Details and apply:
https://lnkd.in/g-YWzrcR

⚠️ IMPORTANT:
Resume/CV will be screened by an ATS AI system. Qualified candidates will receive an AI Interview invitation via email. Please complete the interview promptly to support a faster recruitment process.


hashtag
#Hiring 
hashtag
#FinanceJobs 
hashtag
#InvestmentExpert 
hashtag
#PublicEquity 
hashtag
#DebtModeling 
hashtag
#RiskAnalysis 
hashtag
#CapitalStructure 
hashtag
#InvestmentBanking 
hashtag
#CreditAnalysis 
hashtag
#FinancialModeling 
hashtag
#RemoteJobs 
hashtag
#GlobalHiring 
hashtag
#FinanceCareers 
hashtag
#AssetManagement 
hashtag
#LeveragedFinance 
hashtag
#EquityResearch 
hashtag
#AIRecruitment 
hashtag
#NowHiring 
hashtag
#Fintech', 3, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7082655802716', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'AI & Data Community | Data Scientists, Analysts, Engineers, Python, Generative AI, LLMs & Agentic AI', 'https://www.linkedin.com/groups/6610234/', 'https://www.linkedin.com/feed/update/urn:li:activity:7463808433515933696/', 'Unknown author', 'I hope everyone is doing well and continuously learning in this fast-changing world of technology.
Data Science is evolving faster than ever — and 2026 is shaping up to be the era of AI-powered analytics.

One of the biggest shifts happening right now is the rise of AI Agents in data science workflows. These systems are no longer just assisting with coding; they are beginning to automate data cleaning, feature engineering, reporting, and even model experimentation.
This changes the role of a data scientist significantly.

The future is no longer about only building models — it’s about:
• Asking the right business questions
• Understanding data deeply
• Designing intelligent systems
• Communicating insights effectively
• Working alongside autonomous AI tools

Another important trend is the growing focus on data quality over model size. Organizations are realizing that better datasets often outperform bigger algorithms.
At the same time, responsible AI, governance, and explainability are becoming critical skills for every data professional.
The industry is clearly moving toward a future where:

👉 AI handles repetitive tasks
👉 Humans focus on strategy, creativity, and decision-making
For students and professionals in tech, this is the best time to strengthen 

skills in:
Python • Machine Learning • SQL • Cloud • MLOps • AI Governance • Business Analytics
Data Science is no longer just a technical field — it’s becoming the backbone of decision intelligence across industries.
Exciting times ahead. 🚀
What are your thoughts on the future of Data Science and AI?

hashtag
#DataScience 
hashtag
#ArtificialIntelligence 
hashtag
#MachineLearning 
hashtag
#AI 
hashtag
#Analytics 
hashtag
#Python 
hashtag
#BigData 
hashtag
#MLOps 
hashtag
#TechTrends 
hashtag
#DataAnalytics', 19, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();
INSERT INTO public.linkedin_posts (id, session_id, email_crawl, crawl_date, group_name, group_url, post_url, author, content, likes, comments, shares, posted_at, created_at, updated_at)
VALUES (uuid_generate_v4(), 'lnquynh.digitalmkt.work_7082655802716', 'lnquynh.digitalmkt.work@gmail.com', '2026-05-23'::DATE, 'IT & Software Developers, Data Scientists, AI Engineers & Analysts Community', 'https://www.linkedin.com/groups/10355230/', 'https://www.linkedin.com/feed/update/urn:li:activity:7227182852201668608/', 'Unknown author', 'Power of Data: A Comprehensive Guide to Big Data, AI, and Generative Analytics - Exploring the Core Essentials of Descriptive, Diagnostic, Predictive - https://lnkd.in/gPtDrkXG
Big Data refers to extremely large datasets that are complex, high in volume, and generated at a high velocity. These datasets can come from various sources like social media, sensors, transactions, and more. 
 
Big Data Analytics is the process of examining large and varied datasets—big data—to uncover hidden patterns, correlations, market trends, customer preferences, and other useful business information. 

AI Analytics involves the application of artificial intelligence technologies such as machine learning, natural language processing, and deep learning to analyze data. AI Analytics can automate complex data analysis tasks, identify patterns, make predictions, and generate insights that are often more accurate and actionable than those produced by traditional analytics methods.
 
Generative Analytics is a relatively new approach that uses generative models like Generative Adversarial Networks (GANs) to create new data, scenarios, or predictions based on learned patterns from existing data. This type of analytics is particularly useful for content creation, data augmentation, and simulating potential future outcomes.
 
Big Data Analytics Essentials involves analyzing large, complex datasets to uncover hidden patterns, trends, and insights that drive data-driven decision-making. 

 1. Descriptive Analytics
 - Purpose: To summarize and interpret historical data.
 - Key Techniques: Data aggregation, data mining, data visualization.
 - Tools: Tableau, Power BI, Excel.
 - Applications:
 - Reviewing sales trends over the past year.
 - Summarizing customer demographics.
 - Output: Dashboards, reports, visual summaries.

 2. Diagnostic Analytics
 - Purpose: To diagnose reasons behind historical outcomes.
 - Key Techniques: Drill-down analysis, correlation analysis, data discovery.
 - Tools: SQL, SAS, IBM Cognos.
 - Applications:
 - Identifying causes of a sudden drop in revenue.
 - Analyzing factors leading to customer churn.
 - Output: Root cause analysis, detailed reports.

 3. Predictive Analytics
 - Purpose: To forecast future trends and outcomes.
 - Key Techniques: Statistical modeling, machine learning, time series analysis.
 - Tools: Python (Scikit-learn, TensorFlow), R, IBM SPSS.
 - Applications:
 - Predicting future sales.
 - Forecasting customer behavior.
 - Output: Predictive models, risk assessments, forecasts.

 4. Prescriptive Analytics
 - Purpose: To recommend actions based on predictive insights.
 - Key Techniques: Optimization, simulation, decision analysis.
 - Tools: IBM ILOG CPLEX, MATLAB, SAS.
 - Applications:
 - Optimizing supply chain logistics.
 - Recommending pricing strategies.
 - Output: Actionable recommendations, decision-support systems.', 8, 0, 0, NULL, NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  likes = EXCLUDED.likes, comments = EXCLUDED.comments, updated_at = NOW();

-- 7. CHÈN DỮ LIỆU BẢNG: public.facebook_groups
ALTER TABLE public.facebook_groups DROP CONSTRAINT IF EXISTS unique_facebook_group_url;
ALTER TABLE public.facebook_groups ADD CONSTRAINT unique_facebook_group_url UNIQUE (group_url);
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'HR', NULL, NULL, NULL, NULL, NULL, 12, 13.0, 664, TRUE, '2026-05-29T09:17:24'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'HR', NULL, NULL, NULL, NULL, NULL, 12, 8.0, 1358, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm IT-CNTT Đà Nẵng', 'https://www.facebook.com/groups/908998129562912', 'sosanh', NULL, NULL, NULL, NULL, NULL, 12, NULL, 23, TRUE, '2024-05-22T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/tddn1/', 'sosanh', NULL, NULL, NULL, NULL, NULL, 12, NULL, 23, TRUE, '2024-05-23T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển Dụng Nhân Sự CNTT', 'https://www.facebook.com/groups/1755029618054768/', 'sosanh', NULL, NULL, NULL, NULL, NULL, 12, 2.0, 11, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 3.0, 7, TRUE, '2026-05-26T13:14:30'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng lập trình - Việc làm CNTT Việt Nam', 'https://www.facebook.com/groups/javawebvietnam', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 1.0, 1, TRUE, '2026-05-27T12:25:15'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 5.0, 16, TRUE, '2026-05-27T12:25:15'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 3.0, 38, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 3.0, 5, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 5.0, 8, FALSE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - Việc Làm IT', 'https://www.facebook.com/groups/445083081399121', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, NULL, 24, FALSE, '2024-05-31T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, 4.0, 7, FALSE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm Công Nghệ Thông Tin - CNTT Đà Nẵng', 'https://www.facebook.com/groups/346766082409266', 'sosanh', NULL, NULL, NULL, NULL, NULL, 23, NULL, 24, FALSE, '2024-06-02T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'tuvan', NULL, NULL, NULL, NULL, NULL, 23, 6.0, 31, FALSE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/pinetworkdanang43', 'tuvan', NULL, NULL, NULL, NULL, NULL, 23, NULL, 24, FALSE, '2024-06-04T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'HR', NULL, NULL, NULL, NULL, NULL, 23, 2.0, 12, FALSE, '2026-05-27T12:25:15'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/tddn1/', 'tuvan', NULL, NULL, NULL, NULL, NULL, 23, NULL, 24, FALSE, '2024-06-06T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm Công Nghệ Thông Tin - CNTT Đà Nẵng', 'https://www.facebook.com/groups/346766082409266/', 'tuvan', NULL, NULL, NULL, NULL, NULL, 23, NULL, 24, FALSE, '2024-06-07T14:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'HR', NULL, NULL, NULL, NULL, NULL, 23, 7.0, 11, FALSE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n', 'https://www.facebook.com/groups/n8n.automation', 'sosanh', NULL, NULL, NULL, NULL, NULL, 0, 0.0, 0, FALSE, '2026-05-20T18:01:58'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'HR', NULL, NULL, NULL, NULL, NULL, 50000, 7.0, 481, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng N8N Việt Nam', 'https://www.facebook.com/groups/congdongn8nvn', 'Công Nghệ', NULL, NULL, NULL, NULL, NULL, 13100, 0.0, 0, FALSE, '2026-05-20T16:36:19'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', 'Sales', NULL, NULL, NULL, NULL, NULL, 297700, 4.0, 45, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'HR', NULL, NULL, NULL, NULL, NULL, 2000, 7.0, 89, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'vieclam,', 'https://www.facebook.com/groups/vieclamcnttdn123', 'HR', NULL, NULL, NULL, NULL, NULL, 20, 20.0, 0, FALSE, '2026-05-22T07:44:49'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'Sales', NULL, NULL, NULL, NULL, NULL, 20000, 4.0, 29, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'Sales', NULL, NULL, NULL, NULL, NULL, 217000, 6.0, 1124, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'Sales', NULL, NULL, NULL, NULL, NULL, 125600, 6.0, 559, TRUE, '2026-05-28T11:30:05'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/77711001902782', 'HR', NULL, NULL, NULL, NULL, NULL, 17000, 0.0, 0, TRUE, '2026-05-24T02:16:37'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Group New', 'https://www.facebook.com/groups/777110019027821', 'AI Agent', NULL, NULL, NULL, NULL, NULL, 2400, 0.0, 0, TRUE, '2026-05-24T03:51:56'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Trạm sáng tạo AI (AI Creative Station Vietnam)', 'https://www.facebook.com/groups/videocreativestationwithai', 'AI Agent', NULL, NULL, NULL, NULL, NULL, 12300, 0.0, 0, FALSE, '2026-05-24T03:53:54'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam', 'Sales', NULL, NULL, NULL, NULL, NULL, 217000, 0.0, 0, FALSE, '2026-05-25T02:36:12'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng Tuyển Dụng Agency & Marketing', 'https://www.facebook.com/groups/485058128698180', 'Marketing Agency', 'Marketing', 1, 'Marketing', NULL, NULL, 203300, 0.0, 0, FALSE, '2026-05-26T00:37:55'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng Agency Marketing & Advertising', 'https://www.facebook.com/groups/1167797777025049', 'Marketing Agency', 'Marketing', 1, 'Marketing', NULL, NULL, 89800, 0.0, 0, FALSE, '2026-05-26T00:50:06'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tìm đối tác Agency - Digital Marketing - Truyền thông', 'https://www.facebook.com/groups/567418328847364/?action_source=group_mall_recommendation_affordance', 'Marketing Agency', 'Marketing', 1, 'Marketing', NULL, NULL, 25100, 0.0, 0, FALSE, '2026-05-26T00:51:45'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Seeding Marketing Việt Nam', 'https://www.facebook.com/groups/968674538079315', 'Seeding', 'Marketing', 1, 'Marketing', NULL, NULL, 131800, 0.0, 0, FALSE, '2026-05-26T01:02:34'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, industry, tier, team, icp, icp_desc, members, posts_per_week, health_score, chay_24h, last_crawl, created_at, updated_at)
VALUES (uuid_generate_v4(), 'TÌM AGENCY - AGENCY DIGITAL MAKETING - QUẢNG CÁO TRUYỀN THÔNG - SÁNG TẠO', 'https://www.facebook.com/groups/timagencymkt', 'Marketing Agency', 'Marketing', 1, 'Marketing', NULL, NULL, 10800, 0.0, 0, FALSE, '2026-05-26T01:11:45'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = EXCLUDED.intent, members = EXCLUDED.members, health_score = EXCLUDED.health_score, last_crawl = EXCLUDED.last_crawl, updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm IT-CNTT Đà Nẵng', 'https://www.facebook.com/groups/908998129562912', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/tddn1/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển Dụng Nhân Sự CNTT', 'https://www.facebook.com/groups/1755029618054768/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng lập trình - Việc làm CNTT Việt Nam', 'https://www.facebook.com/groups/javawebvietnam', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - Việc Làm IT', 'https://www.facebook.com/groups/445083081399121', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm Công Nghệ Thông Tin - CNTT Đà Nẵng', 'https://www.facebook.com/groups/346766082409266', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/pinetworkdanang43', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/tddn1/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm Công Nghệ Thông Tin - CNTT Đà Nẵng', 'https://www.facebook.com/groups/346766082409266/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/77711001902782', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();
INSERT INTO public.facebook_groups (id, group_name, group_url, intent, chay_24h, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Group New', 'https://www.facebook.com/groups/777110019027821', NULL, TRUE, NOW(), NOW())
ON CONFLICT (group_url) DO UPDATE SET
  group_name = EXCLUDED.group_name, intent = COALESCE(EXCLUDED.intent, public.facebook_groups.intent), updated_at = NOW();

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
-- 8. CHÈN DỮ LIỆU BẢNG: public.facebook_posts
ALTER TABLE public.facebook_posts DROP CONSTRAINT IF EXISTS unique_facebook_post_url;
ALTER TABLE public.facebook_posts ADD CONSTRAINT unique_facebook_post_url UNIQUE (post_url);
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/966621162890686/', '2026-05-12T18:03:54'::TIMESTAMPTZ, 'Mong được duyệt ạ 
.
Em chào mn ạ. Mn cho em hỏi về trường hợp bản thân em.
Em vừa thực tập 3 tháng (có lương) ở 1 cty không outsrc.
Quá trình thực tập đầy đủ, mọi người trong team đều thân thiện rủ hẹn em đi Team Building này nọ còn đi ăn sn ...v.v
Tự dưng hết 3 tháng thực tập em bị reject không lý do và hẹn ưu tiên CV nếu có vị trí phù hợp.
Em nghĩ mãi không ra lí do và liệu rằng có nên ghi 3 tháng này vào CV không ạ? Ẩn bớt', 226, 117, 41, 9, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35320739797571403/', '2026-05-12T18:03:54'::TIMESTAMPTZ, 'FPT SOFTWARE ĐÀ NẴNG TUYỂN DỤNG 20 CTV XỬ LÝ ẢNH KHÔNG YÊU CẦU KINH NGHIỆM
 8h00 – 17h00 | Thứ 2 – Thứ 6
 Địa điểm làm việc: Tòa nhà FPT Massda – KCN An Đồn, Sơn Trà, Đà Nẵng
Ib hoặc gửi CV về Email: TramLTT2@fpt.com
 Công việc của bạn:
- Gắn nhãn, đóng khung, tô màu, chấm điểm các đối tượng trên hình ảnh bằng tool của khách hàng
- Các đối tượng gồm: làn đường, ô tô, xe máy, người đi bộ và các đối tượng giao thông khác
Yêu cầu:
- vi tính văn phòng cơ bản, thao tác máy tính tốt là lợi thế
- Không yêu cầu kinh nghiệm, sẽ được đào tạo trước khi làm việc
- Chăm chỉ, cẩn thận, có trách nhiệm
- Có thể làm việc fulltime tại công ty và OT khi cần
- Tốt nghiệp Trung cấp/Cao đẳng trở lên
- Có kinh nghiệm tagging/gắn nhãn dữ liệu là lợi thế
Quyền lợi:
- Môi trường làm việc trẻ trung, chuyên nghiệp, văn hóa FPT thân thiện
- Thu nhập ổn định
- Có cơ hội được xem xét ký hợp đồng chính thức', 18, 7, 4, 1, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/689008579_122168868914652190_8862899269068451439_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=110&ccb=1-7&_nc_sid=e06c5d&_nc_eui2=AeFg_uA35xGeurDaIrmUYY54g_G4DUMMWMKD8bgNQwxYwmzMsEgtopnuywJKoIVI5QDekkNl-gnQoQiy5i7Grzsn&_nc_ohc=wNEqwiVIXlkQ7kNvwFlBOpk&_nc_oc=Adq1dZkvyorhuLUBvWTBjoWsVEN82ajEFG-lQ2B-y6TvYOkVPQv6V-kWa5v1y8U4VuSE3UM5-Q9rUm2_qmh3t3LH&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=NoopVmZOiaWZaVHpwtxk4A&_nc_ss=7b2a8&oh=00_Af5JNpgCYFZjytVV6P41RvlMeA0yaxQoHk6un4jvmZliGg&oe=6A08CFBE']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2755806728126437/', '2026-05-12T18:03:54'::TIMESTAMPTZ, '[FPT SOFTWARE ĐÀ NẴNG TUYỂN DỤNG CTV XỬ LÝ ẢNH]
Bạn đang tìm công việc văn phòng ổn định, môi trường chuyên nghiệp và có cơ hội phát triển lâu dài hãy gia nhập ngay team FPT Software Đà Nẵng nhé


 Vị trí: CTV Xử Lý Ảnh (Data Labeling)

 Công việc của bạn:
- Gắn nhãn, đóng khung, tô màu, chấm điểm các đối tượng trên hình ảnh bằng tool của khách hàng
- Các đối tượng gồm: làn đường, ô tô, xe máy, người đi bộ và các đối tượng giao thông khác
Yêu cầu:
- vi tính văn phòng cơ bản, thao tác máy tính tốt là lợi thế
- Không yêu cầu kinh nghiệm, sẽ được đào tạo trước khi làm việc
- Chăm chỉ, cẩn thận, có trách nhiệm
- Có thể làm việc fulltime tại công ty và OT khi cần
- Tốt nghiệp Trung cấp/Cao đẳng trở lên
- Có kinh nghiệm tagging/gắn nhãn dữ liệu là lợi thế


Quyền lợi:
- Môi trường làm việc trẻ trung, chuyên nghiệp, văn hóa FPT thân thiện
- Thu nhập ổn định
- Có cơ hội được xem xét ký hợp đồng chính thức


 8h00 – 17h00 | Thứ 2 – Thứ 6

 Địa điểm làm việc: Tòa nhà FPT Massda – KCN An Đồn, Sơn Trà, Đà Nẵng
 Ib hoặc gửi CV về Email: TramLTT2@fpt.com', 172, 35, 25, 29, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/698347815_122168868062652190_4447623714715775141_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=1&ccb=1-7&_nc_sid=e06c5d&_nc_eui2=AeHRVvSMVrbmR2wss1hqqhx5FL_moddhBpYUv-ah12EGlmbBFyrvxdqB_jQ599lkalUaiaJ9PX3Sl5o_XPQbwCjo&_nc_ohc=lDcgaWGYKSEQ7kNvwGKOa3m&_nc_oc=AdqMmBxw8a-MpjGue8nqwrUolt6CP78OvM7XSyMq61Uy4DSVyyEUY2hKDQS_nQiihD0m5C3MSoL9jwdDVU7mA0Es&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=1evenhRcdsaw1aNhI_-_iw&_nc_ss=7b2a8&oh=00_Af6KMO1z6kQsjFDcp9HKEtO1-nGfAhumpxBrfX3KLKhOQw&oe=6A08C415']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/966621162890686/', '2026-05-12T18:54:09'::TIMESTAMPTZ, 'Mong được duyệt ạ 
.
Em chào mn ạ. Mn cho em hỏi về trường hợp bản thân em.
Em vừa thực tập 3 tháng (có lương) ở 1 cty không outsrc.
Quá trình thực tập đầy đủ, mọi người trong team đều thân thiện rủ hẹn em đi Team Building này nọ còn đi ăn sn ...v.v
Tự dưng hết 3 tháng thực tập em bị reject không lý do và hẹn ưu tiên CV nếu có vị trí phù hợp.
Em nghĩ mãi không ra lí do và liệu rằng có nên ghi 3 tháng này vào CV không ạ? Ẩn bớt', 229, 118, 42, 9, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35320739797571403/', '2026-05-12T18:54:09'::TIMESTAMPTZ, 'FPT SOFTWARE ĐÀ NẴNG TUYỂN DỤNG 20 CTV XỬ LÝ ẢNH KHÔNG YÊU CẦU KINH NGHIỆM
 8h00 – 17h00 | Thứ 2 – Thứ 6
 Địa điểm làm việc: Tòa nhà FPT Massda – KCN An Đồn, Sơn Trà, Đà Nẵng
Ib hoặc gửi CV về Email: TramLTT2@fpt.com
 Công việc của bạn:
- Gắn nhãn, đóng khung, tô màu, chấm điểm các đối tượng trên hình ảnh bằng tool của khách hàng
- Các đối tượng gồm: làn đường, ô tô, xe máy, người đi bộ và các đối tượng giao thông khác
Yêu cầu:
- vi tính văn phòng cơ bản, thao tác máy tính tốt là lợi thế
- Không yêu cầu kinh nghiệm, sẽ được đào tạo trước khi làm việc
- Chăm chỉ, cẩn thận, có trách nhiệm
- Có thể làm việc fulltime tại công ty và OT khi cần
- Tốt nghiệp Trung cấp/Cao đẳng trở lên
- Có kinh nghiệm tagging/gắn nhãn dữ liệu là lợi thế
Quyền lợi:
- Môi trường làm việc trẻ trung, chuyên nghiệp, văn hóa FPT thân thiện
- Thu nhập ổn định
- Có cơ hội được xem xét ký hợp đồng chính thức', 19, 8, 4, 1, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/689008579_122168868914652190_8862899269068451439_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=110&ccb=1-7&_nc_sid=e06c5d&_nc_eui2=AeFg_uA35xGeurDaIrmUYY54g_G4DUMMWMKD8bgNQwxYwmzMsEgtopnuywJKoIVI5QDekkNl-gnQoQiy5i7Grzsn&_nc_ohc=wNEqwiVIXlkQ7kNvwFlBOpk&_nc_oc=Adq1dZkvyorhuLUBvWTBjoWsVEN82ajEFG-lQ2B-y6TvYOkVPQv6V-kWa5v1y8U4VuSE3UM5-Q9rUm2_qmh3t3LH&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=sZ9z5T6wjGvZk9NgB9cphg&_nc_ss=7b2a8&oh=00_Af6ZCDKLqn8g0zWGE88GwU1E5DQSTmEvr-GL4aPE63197Q&oe=6A08CFBE']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2755832041457239/', '2026-05-12T18:54:09'::TIMESTAMPTZ, 'Dạ anh chị cho em xin range lương vị trí QA Junior của Avepoint với được không ạ.
Sắp tới e có buổi pv mà chưa biết deal sao', 53, 9, 22, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/966621162890686/', '2026-05-12T19:04:50'::TIMESTAMPTZ, 'Mong được duyệt ạ 
.
Em chào mn ạ. Mn cho em hỏi về trường hợp bản thân em.
Em vừa thực tập 3 tháng (có lương) ở 1 cty không outsrc.
Quá trình thực tập đầy đủ, mọi người trong team đều thân thiện rủ hẹn em đi Team Building này nọ còn đi ăn sn ...v.v
Tự dưng hết 3 tháng thực tập em bị reject không lý do và hẹn ưu tiên CV nếu có vị trí phù hợp.
Em nghĩ mãi không ra lí do và liệu rằng có nên ghi 3 tháng này vào CV không ạ? Ẩn bớt', 231, 118, 43, 9, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35320739797571403/', '2026-05-12T19:04:50'::TIMESTAMPTZ, 'FPT SOFTWARE ĐÀ NẴNG TUYỂN DỤNG 20 CTV XỬ LÝ ẢNH KHÔNG YÊU CẦU KINH NGHIỆM
 8h00 – 17h00 | Thứ 2 – Thứ 6
 Địa điểm làm việc: Tòa nhà FPT Massda – KCN An Đồn, Sơn Trà, Đà Nẵng
Ib hoặc gửi CV về Email: TramLTT2@fpt.com
 Công việc của bạn:
- Gắn nhãn, đóng khung, tô màu, chấm điểm các đối tượng trên hình ảnh bằng tool của khách hàng
- Các đối tượng gồm: làn đường, ô tô, xe máy, người đi bộ và các đối tượng giao thông khác
Yêu cầu:
- vi tính văn phòng cơ bản, thao tác máy tính tốt là lợi thế
- Không yêu cầu kinh nghiệm, sẽ được đào tạo trước khi làm việc
- Chăm chỉ, cẩn thận, có trách nhiệm
- Có thể làm việc fulltime tại công ty và OT khi cần
- Tốt nghiệp Trung cấp/Cao đẳng trở lên
- Có kinh nghiệm tagging/gắn nhãn dữ liệu là lợi thế
Quyền lợi:
- Môi trường làm việc trẻ trung, chuyên nghiệp, văn hóa FPT thân thiện
- Thu nhập ổn định
- Có cơ hội được xem xét ký hợp đồng chính thức', 22, 8, 4, 2, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/689008579_122168868914652190_8862899269068451439_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=110&ccb=1-7&_nc_sid=e06c5d&_nc_eui2=AeFg_uA35xGeurDaIrmUYY54g_G4DUMMWMKD8bgNQwxYwmzMsEgtopnuywJKoIVI5QDekkNl-gnQoQiy5i7Grzsn&_nc_ohc=wNEqwiVIXlkQ7kNvwFlBOpk&_nc_oc=Adq1dZkvyorhuLUBvWTBjoWsVEN82ajEFG-lQ2B-y6TvYOkVPQv6V-kWa5v1y8U4VuSE3UM5-Q9rUm2_qmh3t3LH&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=0bIH1i2NctI01XTw1Ajrhw&_nc_ss=7b2a8&oh=00_Af44mSaCKyOyINY33EPsgXW7zabSy1_ZfDrnSRwhxEK7yQ&oe=6A08CFBE']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35300672799578103/', '2026-05-12T19:42:57'::TIMESTAMPTZ, 'ĐÀ NẴNG — ASIAN MOBILE SOFTWARE
Asian Mobile Software đang mở rộng team và tìm kiếm 2 vị trí mới — nếu bạn đang tìm môi trường thực chiến, sản phẩm thật và team thân thiện thì hãy gia nhập ngay!
UI/UX DESIGNER (Internship)

TESTER (Internship / Fresher)

Bạn sẽ nhận được gì khi gia nhập Asian Mobile?
Hỗ trợ chi phí thực tập / lương Fresher cạnh tranh
Được Leader trực tiếp hướng dẫn
Tham gia các hoạt động Teambuilding / Company trip
Môi trường trẻ, thân thiện, không toxic — nhiều cơ hội phát triển
Cơ hội chuyển chính thức sau thực tập nếu phù hợp
Thưởng các dịp Lễ, Tết & thưởng dự án
ỨNG TUYỂN NGAY
Tiêu đề: [Internship/Fresher _ Vị trí _ Họ tên]
Gửi CV: chaugiang.admin@asianmobile.ltd

Mọi thông tin chi tiết về JOB, mọi người inbox trực tiếp để em trao đổi kỹ hơn và hỗ trợ nhanh nhất nhé.', 100, 28, 3, 22, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/695175132_3812712298866231_3171797253039435221_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=101&ccb=1-7&_nc_sid=e06c5d&_nc_eui2=AeFSAo1QRuuUvTBJxmd-l1DgW6tepV8JSltbq16lXwlKW_eIe6wVqNwlks6tKbcW6EXc1asoKWy9WLJZbdyDt0Kz&_nc_ohc=zE97gCZfoiEQ7kNvwFRX9AA&_nc_oc=AdoI8yamLGp1xmU7nnfw9xcQYge9214P9FcLKhE6-3Ry3pm8-kBUlINGBCnvbbgivab1X5XRwjVsQLMmm9cE8l8B&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=M-tGOKfLFhpbPNKTYhvtpQ&_nc_ss=7b2a8&oh=00_Af6mRlXB-M4DAmEvI7ZvH3WCmba2lxlazbPNks3TTb-ArA&oe=6A090618']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'quang tri', 'https://www.facebook.com/groups/550067715203081/', 'https://www.facebook.com/groups/550067715203081/posts/3057916954418132/', '2026-05-13T11:13:57'::TIMESTAMPTZ, 'Ngày mai thứ 4 em có lại Bánh ướt Phương lang nha cả nhà !!
Bánh ướt Phương lang đặc sản Quảng trị #38k 1kg( kèm nước mắm)
Thịt ba chỉ rút sườn ( heo  sạch nhà mổ e lấy tại nhà không phải heo chợ nha) #165k 1kg
Sườn non #175k 1kg 
Chả heo quê #150k 1kg
 Chả da #125k 1kg
Quả chua #35k 1kg
Ớt bột nhà ngoại trồng tự xay #30k 1 lon
Bột gạo , bột mỳ #30k 1kg
Nước mắm biển #75k 1 lít
0378368332
Thương mời cả nhà lên đơn trưa mai e  bắt đầu trả đơn sớm nha
 Ẩn bớt', 15, 1, 7, 0, 'https://www.facebook.com/100024533971007/videos/pcb.3057916954418132/1306873330807082', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/696240793_2283899629104481_8189670767489708788_n.jpg?stp=dst-jpg_p480x480_tt6&_nc_cat=109&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeF2iMetVQytl2oRoVjsKzznQ5h2lcKSbFlDmHaVwpJsWQYfWIY7K2l4uqRB7o2JxUaGxdq_mNvhoqTrnPliFmF2&_nc_ohc=d44JUrj2B-8Q7kNvwGjmfvm&_nc_oc=Adocs72qK1Cq01xQYP2B3Urel7iEumF-u9peZgvi3TzSM8jG-6zU6J39RmO4VltAjWS1O2l2I8BXM_lyxlfF8Ll0&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=OOEI10ddAkC2vXtt1pLjhw&_nc_ss=7b2a8&oh=00_Af5DEQ-DuGxKcHcquby4idjqHalTKEze9iL0SAkadOT9hg&oe=6A09B5F4', 'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/692826750_2283899775771133_7833007109519816659_n.jpg?stp=cp6_dst-jpg_s590x590_tt6&_nc_cat=111&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeGzA0k9ebzjg9hkFDmPcmoy7V_5vShQJPvtX_m9KFAk-w9MWlYxUSBhqSWNQP8zepNQzydAAI7plREYxUH29l4P&_nc_ohc=7wtITm5dwB4Q7kNvwH0oKV5&_nc_oc=AdphovxFuUkP5MbjYoeQP399ItodOVfi7dCSp-nm3NdOWVf4MnGwtmPk3WJoIWRA7JLNMDXzjmwngXJq87HJEBWJ&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=OOEI10ddAkC2vXtt1pLjhw&_nc_ss=7b2a8&oh=00_Af5Q6T8Kpdj0Ss48TJuQTnRPLsNdUZcKejbzaQe8QO-Tpg&oe=6A09E4EB', 'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/695469860_2283899669104477_1572435548425956680_n.jpg?stp=cp6_dst-jpg_s590x590_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeER7mVY6fWR9jJPOwNoGE1CFw9jfTgRKWIXD2N9OBEpYg7QIZp9e70qKVJlCm05cZSiCUK2vCeVmEg0hxdmVpdK&_nc_ohc=oyPWk5BK6DMQ7kNvwGL1YPG&_nc_oc=Ados4YFpR4YDIpOS7aEdyzK3xgpVkpYYx0MVu-YS7AguyrSMvak_uoYRCtKf0M60FkLpTA9lZhRel-s8tQuaO7t5&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=OOEI10ddAkC2vXtt1pLjhw&_nc_ss=7b2a8&oh=00_Af6jGPgU7Q6Hk3WV83ZiMYleH-ZyeQv2uKCn-WhfLyS6kQ&oe=6A09B4BB', 'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/699132707_2283899639104480_5649122621422325627_n.jpg?stp=cp6_dst-jpg_s590x590_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeEAJigxQT9BiGgHb3BY3rB8zSh69qxZy7TNKHr2rFnLtKxf82f9YbC2cS1aXrTVtii834BtMsDTIl7WUBTF-kKV&_nc_ohc=B5wT1En3qxkQ7kNvwHyIGr1&_nc_oc=AdrZS_2YgEjfUv8s4J5QbxzGN3OryJnxiLP3z_IdsIpEnmJDTYrB68cGDQKk41zAeasekP48DU7NTNUt3Ocb_dlz&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=OOEI10ddAkC2vXtt1pLjhw&_nc_ss=7b2a8&oh=00_Af4rax_hSdcVetClo6g27NsWc8KIrKEKJU3hcLY0rF8dQA&oe=6A09E73F']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Growth Hacker Vietnam', 'https://www.facebook.com/groups/1287572879512264?locale=vi_VN', 'https://www.facebook.com/groups/1287572879512264/posts/1497846315151585/', '2026-05-13T14:18:12'::TIMESTAMPTZ, 'Dragon Fever TD! V2.25.0
APK FREE SHOP 
AE CẦN IB', 6, 2, 2, 0, 'https://www.facebook.com/100007129024211/videos/pcb.1497846315151585/938428592338672', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/696214817_4357500914497500_4819659920172164844_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeE9mD73pkS7RDiISd-XzaTPd-WD_4o6vT135YP_ijq9PeOmvw7oWduQR_CoxfEXr-cpCMCEEi9lUvwslNB5-_hS&_nc_ohc=OEZKUbFSC1wQ7kNvwGZ7Bxv&_nc_oc=AdrNWNSpZX1kswnNW1DQHRjIINv9b_7WehI0Yq1qOvu0sszB1bKcySmZgikkWIfUR8_MwqF9-EE7VZkGIrM_UV_c&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=1usYhFXvqvmjRcPZNVRS_w&_nc_ss=7b2a8&oh=00_Af5qg3Nr-eZba7UkfINqg5TMXhr-OMKNliihe6BO7SWGiA&oe=6A0A11B6']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Growth Hacker Vietnam', 'https://www.facebook.com/groups/1287572879512264?locale=vi_VN', 'https://www.facebook.com/groups/1287572879512264/posts/1497846315151585/', '2026-05-13T14:45:00'::TIMESTAMPTZ, 'Dragon Fever TD! V2.25.0
APK FREE SHOP 
AE CẦN IB', 6, 2, 2, 0, 'https://www.facebook.com/100007129024211/videos/pcb.1497846315151585/938428592338672', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/696214817_4357500914497500_4819659920172164844_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_eui2=AeE9mD73pkS7RDiISd-XzaTPd-WD_4o6vT135YP_ijq9PeOmvw7oWduQR_CoxfEXr-cpCMCEEi9lUvwslNB5-_hS&_nc_ohc=OEZKUbFSC1wQ7kNvwGZ7Bxv&_nc_oc=AdrNWNSpZX1kswnNW1DQHRjIINv9b_7WehI0Yq1qOvu0sszB1bKcySmZgikkWIfUR8_MwqF9-EE7VZkGIrM_UV_c&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=2vk7E9itnh-jxoAIZIqzNg&_nc_ss=7b2a8&oh=00_Af7NNkQVchFgBqnCpoO1fo3RA58v2ncF_DczNgk1BPQHsg&oe=6A0A11B6']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'ok', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/970322499187219/', '2026-05-17T11:10:35'::TIMESTAMPTZ, '2k4 có ai chưa tìm được việc không ạ, em lo quá', 553, 119, 124, 62, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/970322499187219/', '2026-05-17T11:17:03'::TIMESTAMPTZ, '2k4 có ai chưa tìm được việc không ạ, em lo quá', 544, 117, 122, 61, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35443485008630214/', '2026-05-17T11:17:03'::TIMESTAMPTZ, 'Tuyển Fresher/Junior Developer (Python + Next.js)
Mình đang tìm 1 bạn Fresher/Junior có nền tảng cơ bản về Python và Next.js để cùng làm việc và phát triển lâu dài.
YÊU CẦU
Có kiến thức cơ bản về Python
Đã từng làm việc với NextJS
Có tư duy logic tốt, chủ động học hỏi
Có thể làm việc độc lập và trao đổi trực tiếp
Yêu cầu tối thiểu 2 giờ/ngày
Strong về Backend
Có kinh nghiệm làm API, database, hoặc system design cơ bản
Ưu tiên bạn nào có thể đi làm ngay
HÌNH THỨC LÀM VIỆC
Pair 1-1 trực tiếp với mình
Làm việc tại nhà mình ở quận Cẩm Lệ, Đà Nẵng
Part-time: 16 đến 20 giờ/tuần (yêu cầu tối thiểu 2 giờ/ngày)
Có thể làm full-time nếu phù hợp và có nhu cầu
MỨC LƯƠNG
Fresher: từ 50.000 VNĐ/giờ
Junior (từ 1 năm kinh nghiệm): từ 65.000 VNĐ/giờ
Lương sẽ tăng theo năng lực và tốc độ phát triển (cái này mình sẽ trao đổi trực tiếp lúc phỏng vấn)
QUYỀN LỢI:
Được mentoring sát sao (code, tư duy, best practices)
Cơ hội học nhanh, làm thật, va chạm thực tế
 Gửi CV qua email: bui.thi.thu.huong.0907@gmail.com

 Zalo/SĐT liên hệ: 0772474594', 14, 7, 2, 1, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2759754124398364/', '2026-05-17T11:17:03'::TIMESTAMPTZ, 'Hi mọi người,
Mình là sinh viên năm 2 và vừa hoàn thành một project DevSecOps end-to-end để hiểu rõ hơn cách một hệ thống hiện đại được build, scan, deploy và vận hành trên Kubernetes.
Project: Hospital EKS DevSecOps GitOps Platform
Tech stack chính:
Frontend: React/Vite
Backend: ASP.NET Core 9
Database: SQL Server
CI/CD: GitHub Actions
Cloud/Kubernetes: AWS EKS
GitOps: Argo CD
IaC: Terraform
Trong project này, mình đã thực hành:
 Build frontend/backend bằng GitHub Actions

 Cache dependency và lưu artifacts với Nexus

 Scan code với SonarQube, scan security với Trivy

 Build Docker image trên EC2 và push lên Amazon ECR

 Deploy lên EKS bằng Argo CD GitOps

 Tích hợp Kyverno, Falco, Prometheus, Grafana và Alertmanager
Project này giúp mình hiểu rõ hơn flow DevSecOps thực tế: từ source code → CI/CD → security scan → image registry → GitOps deployment → monitoring trên Kubernetes.
Mình rất mong nhận được góp ý từ mọi người để cải thiện thêm.
Repository:https://github.com/Kien-devops/eks-cicd-argocd-sec-monitor
#DevSecOps #Kubernetes #AWS #EKS #GitOps #ArgoCD #Terraform #Docker #StudentProject', 82, 22, 24, 4, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/701260301_957496843800906_8607969300947959315_n.png?stp=dst-png_s960x960&_nc_cat=107&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=1dYMnEwtzrEQ7kNvwEuM3fE&_nc_oc=Adq-M2Eeseup3QZzyWiP-C4QirS6M5krCAcYnE25n4sb2bUqqlMfufHgAE-xDtGyAEk&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=j8tiq-d_ti_v1n7GkWDa9w&_nc_ss=7b2a8&oh=00_Af7jekzM-hEHQiPNOibv72GwQLEhNE8_AwW5ZF3vd3p56w&oe=6A0F165E']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1972712176715303/', '2026-05-17T11:17:03'::TIMESTAMPTZ, 'Hiện công ty cần tuyển 3 nhân viên IT mới ra trường, ưu tiên ứng viên nữ. LH: 0934830534', 10, 2, 1, 2, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27003557332593796/', '2026-05-17T11:17:03'::TIMESTAMPTZ, 'TGV Software đang tuyển vị trí:
- Android (Fresher)
  ỨNG TUYỂN NGAY
Gửi CV/Portfolio (nếu có) về: admin@tgv-software.org
Tiêu đề: [Họ và tên]_[Vị trí ứng tuyển]
𝐉𝐃 𝐜𝐡𝐢 𝐭𝐢𝐞̂́𝐭 𝐜𝐡𝐨 𝐛𝐚̣𝐧 𝐧𝐚̀𝐨 𝐪𝐮𝐚𝐧 𝐭𝐚̂𝐦
https://docs.google.com/.../111AS9YHfnIlgTeItLQra.../edit...
--------------------
𝐓𝐆𝐕 𝐒𝐨𝐟𝐭𝐰𝐚𝐫𝐞 
Address: 19 Doãn Khuê, Hải Châu, Đà Nẵng
Email: admin@tgv-software.org
#tgvsoftware Ẩn bớt', 3, 1, 1, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/701636000_1005627905221517_8598770629859133844_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=LSOvJ-12mn4Q7kNvwHfxyHu&_nc_oc=AdruwJF7iWdgbNjRBx4GZj00COpK-rRcMjMpD44SHRSHuMHlHdA0myRP1Bc7LkZ43aM&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=A-SQNQMDRsIb6e3OTMyf3g&_nc_ss=7b2a8&oh=00_Af4Km2LGqUpFV6B9xD6jrkAcqqHYpVqyO8oc_JureCI1-Q&oe=6A0F2010']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'https://www.facebook.com/groups/myprofiles/posts/26854218847554687/', '2026-05-17T11:17:03'::TIMESTAMPTZ, '[HN]Kính Mắt Lily - Bên mình cần 1 IT chuyển đổi số. Có từ 6th kinh nghiệm. TN 9-12tr. LH: 0385052705', 6, 2, 2, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/973421468877322/', '2026-05-20T10:32:06'::TIMESTAMPTZ, 'Nguyễn Văn Lộc, Hà Đông
tuyển thực tập sinh IT
ib để nhận job', 47, 15, 13, 2, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/973695415516594/', '2026-05-21T13:08:26'::TIMESTAMPTZ, 'Chào các anh chị ạ, em hiện tại là sinh viên năm 4 trường đại học Công Nghiệp ngành kỹ thuật phần mềm ạ. hiện tại em đang muốn được ứng tuyển vào các công ty để thực tập ở vị trí intern / fresher trong mảng frontend ạ. Đây là CV của em ạ .Mng cho em xin review ạ , em cảm ơn ạ.', 295, 53, 55, 44, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/702703459_1857148641630439_9321405223989839_n.png?stp=dst-png_s565x565&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=InfW_RWaT7sQ7kNvwGlewy9&_nc_oc=Adp9HFVyU74VdNKPD59IueUcN9_dgeGejA9ic1H6RR8vPBaGQVSfbHQehz5O4KJ9Wrs&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=_mz6vFa6mLJqlGwFvq_Bng&_nc_ss=7b2a8&oh=00_Af5jS0vKxfBtbbF6wN2QcgFCA6UOuRUVaWAJ3j-NBFMQmg&oe=6A14936F']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35538992649079449/', '2026-05-21T13:08:26'::TIMESTAMPTZ, 'dạ cho e hỏi là hiện tại có công ty nào ở đà nẵng tuyển fresher backend k ạ. e cảm ơn nhiều ạ', 24, 4, 10, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2764390050601438/', '2026-05-21T13:08:26'::TIMESTAMPTZ, 'Chào mọi người, em hiện là sinh viên năm 4 ĐH Bách Khoa Đà Nẵng, chuyên ngành Khoa học dữ liệu & Trí tuệ nhân tạo, GPA hiện trên 3.7 và đang định hướng theo AI Engineer.
Hiện em đang tìm cơ hội thực tập AI Engineer/AI Intern hoặc các vị trí liên quan đến AI/ML, NLP, Data Science,... Không biết hiện tại có công ty nào đang tuyển intern mảng này không ạ, hoặc anh/chị nào biết team/công ty đang cần intern có thể giới thiệu giúp em với.
Nếu tiện mọi người có thể để tên công ty hoặc thông tin liên hệ dưới comment để em chủ động liên hệ ạ.
Em cảm ơn mọi người nhiều! Ẩn bớt', 203, 45, 46, 22, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'https://www.facebook.com/groups/myprofiles/posts/26936585872651317/', '2026-05-21T13:08:26'::TIMESTAMPTZ, 'MSE-AI: BỆ PHÓNG PHÁT TRIỂN CHO NGƯỜI LÀM CÔNG NGHỆ 
Bạn là kỹ sư, lập trình viên muốn bứt phá nhanh hơn? Đừng chỉ dừng lại ở Code, hãy trở thành người dẫn dắt cùng chương trình Thạc sĩ Kỹ thuật phần mềm định hướng AI (MSE-AI) tại Đại học FPT!
Tại sao MSE-AI là lựa chọn hàng đầu cho "dân Tech"?
 Đào tạo chuyên sâu: Tập trung vào xây dựng và quản trị các dự án phần mềm & sản phẩm AI phức tạp. 
 Dự án thực tế: Thực hành trực tiếp trên các bài toán thực tế với giáo trình cập nhật liên tục theo xu hướng thế giới. 
 Giảng viên chuyên gia: Học hỏi từ đội ngũ giáo sư, tiến sĩ và các chuyên gia công nghệ giàu kinh nghiệm thực tế. 
 Bằng cấp uy tín: Nhận bằng Thạc sĩ chính quy từ Đại học FPT – Tập đoàn công nghệ tiên phong tại Việt Nam.
------
 
 Lịch học: 18h00 - 21h00 (Thứ 2 - 4 - 6) – Phù hợp cho người đi làm. 
 Hình thức: Xét tuyển (Dựa trên bằng Đại học và Chứng chỉ ngoại ngữ).
 Đăng ký nhận chi tiết chương trình học tại: https://ap.fsb.edu.vn/link/fsbdn010 Ẩn bớt', 3, 1, 1, 0, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/705259744_122190251738624870_8037396532513273650_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=rXCkXdJdQaUQ7kNvwFPmlAD&_nc_oc=AdpjAEFA1fqjOgQoX-C4Rd14H8XCcMDuZZfDBTLwLaaEAjDC-SDkY7Lo8mjVoj1-o5I&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=nTel5LiRqwCgOP5GbrQ-pQ&_nc_ss=7b2a8&oh=00_Af5VMMtqEvH_QJ25gkJSNPk7e_Cepc05bX_1E-CbAjVMWw&oe=6A14DE9E']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/978458951746523/', '2026-05-21T13:08:26'::TIMESTAMPTZ, '[HN2927] Nhân viên IT HELPDESK - ĐÔNG ANH, HÀ NỘI
Lương: 12M
Tốt nghiệp từ CĐ trở lên chuyên ngành Công nghệ Thông tin hoặc liên quan.
Có 1–2 năm kinh nghiệm ở vị trí IT Helpdesk hoặc tương đương.
Có kiến thức cơ bản về: Hệ thống mạng Máy in, thiết bị văn phòng Camera giám sát Kỹ năng xử lý sự cố nhanh, giao tiếp tốt và hỗ trợ người dùng.
LH: 0982473621', 7, 1, 3, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2764390050601438/', '2026-05-21T13:08:26'::TIMESTAMPTZ, 'Chào mọi người, em hiện là sinh viên năm 4 ĐH Bách Khoa Đà Nẵng, chuyên ngành Khoa học dữ liệu & Trí tuệ nhân tạo, GPA hiện trên 3.7 và đang định hướng theo AI Engineer.
Hiện em đang tìm cơ hội thực tập AI Engineer/AI Intern hoặc các vị trí liên quan đến AI/ML, NLP, Data Science,... Không biết hiện tại có công ty nào đang tuyển intern mảng này không ạ, hoặc anh/chị nào biết team/công ty đang cần intern có thể giới thiệu giúp em với.
Nếu tiện mọi người có thể để tên công ty hoặc thông tin liên hệ dưới comment để em chủ động liên hệ ạ.
Em cảm ơn mọi người nhiều! Ẩn bớt', 203, 45, 46, 22, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35559694743675906/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'Dạ cho mik hỏi, ở đây có ai làm công ty haibazo chưa ạ, cho em xin review với ạ', 34, 8, 13, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2765427277164382/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'Cho hỏi chỗ Aeon Đà Nẵng sắp khai trương, ko biết có tuyển vị trí IT ko ạ, cảm ơn ạ', 247, 62, 64, 19, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1978352842817903/', '2026-05-22T11:52:51'::TIMESTAMPTZ, '[ĐN] Cty em cần chiêu mộ PM/BRSE (tiếng Nhật N1/N2), offer cực kỳ hấp dẫn
Ib zalo em 0903892106 nhận JD ạ.', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'https://www.facebook.com/groups/880353022746185/posts/2136667080448100/', '2026-05-22T11:52:51'::TIMESTAMPTZ, '[Kaopiz Holdings] tìm kiếm 01 Teamlead .NET
Có từ 1.5 năm ở vị trí Teamlead/ Sublead
Có kinh nghiệm dự án với KH Nhật
Có kinh nghiệm tối ưu hệ thống
Ping em Quyên lấy JD chi tiết nhé ạ!', 2, 2, 0, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/690671041_991024776829705_7427955684359710162_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=h7YSBqLuZ4IQ7kNvwGdJPLF&_nc_oc=Adr8p-GlW49RuXcL-SJrh8J-90CEUZDUKVZx_nEgzEIiADZNshOT-ddrnaQk4oLiFG8&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=zIckQ7ltTecZVudVhn7bfQ&_nc_ss=7b2a8&oh=00_Af4uJtSWaXoW2xmSfXE-YCQM8W8BvBVsM9FBBFFSQEG44w&oe=6A15FA5D']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'https://www.facebook.com/groups/3614844702129254/posts/4441758369437879/', '2026-05-22T11:52:51'::TIMESTAMPTZ, '[ĐN] Cty em cần chiêu mộ PM/BRSE (tiếng Nhật N1/N2), offer cực kỳ hấp dẫn
Ib zalo em 0903892106 nhận JD ạ.', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', 'https://www.facebook.com/groups/486674299325438/posts/1689560602370129/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'One Tech Stop Vietnam đang mở rộng đội ngũ với nhiều cơ hội hấp dẫn tại Đà Nẵng & Hồ Chí Minh!
 Địa điểm:
Đà Nẵng
Hồ Chí Minh
 Open positions:
[Da Nang] Agile Delivery Manager
[Ho Chi Minh] QA Engineer
[Da Nang / Ho Chi Minh] UI/UX Designer
[Da Nang & Ho Chi Minh] Technical Architect
[Da Nang] Scrum Master
[Da Nang] Full-Stack Developer (ReactJS/ NodeJS)
[Ho Chi Minh] Full-Stack Developer (ReactJS/ NodeJS)
 Benefits nổi bật:
Môi trường làm việc quốc tế, năng động
Cơ hội phát triển cùng các dự án công nghệ hiện đại
Chính sách phúc lợi & work-life balance hấp dẫn
 Apply ngay tại: https://itviec.com/companies/one-tech-stop-vietnam-company-ltd', 6, 2, 2, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27075701648712697/', '2026-05-22T11:52:51'::TIMESTAMPTZ, '[ĐN] Cty em cần chiêu mộ PM/BRSE (tiếng Nhật N1/N2), offer cực kỳ hấp dẫn
Ib zalo em 0903892106 nhận JD ạ.', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/979238221668596/', '2026-05-22T11:52:51'::TIMESTAMPTZ, '[REMOTE IT JOBS] Cần UV location ở miền Nam.
- 2 Business Analyst (BA) - Mảng Logistics/WMS
- 6 Application Consultant (Nhân sự Triển khai hệ thống)
Khi cần triển khai sản phẩm thì sẽ đi Phú Quốc hoặc Bình Dương.
Có kn về Infolog WMS là điểm cộng lớn.
--
ACE làm được ib Phương nha Ẩn bớt', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2765427277164382/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'Cho hỏi chỗ Aeon Đà Nẵng sắp khai trương, ko biết có tuyển vị trí IT ko ạ, cảm ơn ạ', 283, 73, 75, 20, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', 'https://www.facebook.com/groups/1358071568620767/posts/1606215900472998/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'Mình vừa test xong 1 tool mà thấy phải chia sẻ ngay.
Tên nó là: n8n-as-code
(repo GitHub: EtienneLescot/n8n-as-code)
---
Trước giờ build workflow n8n, mình làm theo kiểu:
→ Kéo thả trên UI
→ AI gợi ý JSON → mình tự copy vào
→ Lỗi node thì debug bằng tay
Vấn đề không phải là chậm.
Vấn đề là AI đang... đoán mò.
Nó không thực sự hiểu schema của từng node n8n.
Nên sinh ra workflow xong, sai parameter, sai option value.
Mình lại mất thêm 30 phút ngồi fix.
---
n8n-as-code giải quyết đúng cái này.
Thay vì AI đoán, tool này đưa cho agent:
→ 537 node chính thức với full schema
→ 10.209 properties + 17.155 option values
→ 7.702 workflow template của cộng đồng
→ 1.243 trang docs tích hợp sẵn
Hiểu nôm na: Agent giờ có bản đồ đầy đủ của n8n.
Không đoán nữa. Biết chính xác node nào có parameter gì.
---
Cái mình thích nhất là phần GitOps.
Workflow không còn nằm trong UI n8n như 1 cái hộp đen nữa.
Nó được kéo ra thành file TypeScript/JSON trên máy.
Có thể diff, review, merge như code bình thường.
Quy trình thực tế:
1. Agent search node + docs trước khi viết
2. Pull workflow về file local
3. Edit bằng JSON hoặc TypeScript
4. Validate theo schema thật → bắt lỗi trước khi push
5. Push file cụ thể lên n8n
---
Với VS Code hoặc Cursor, có extension riêng.
Cài xong là có ngay Agent Workbench tích hợp thẳng vào IDE.
Mình dùng cùng với Cursor — agent có thể nhìn thấy workflow đang mở,
môi trường n8n đang kết nối, và toàn bộ context của project.
Cảm giác như pair coding — nhưng partner là AI biết n8n hơn mình.
---
Cái tool này phù hợp với ai?
→ Đang build workflow n8n cho khách hàng với số lượng lớn
→ Muốn reuse template nhanh mà không sợ AI sinh sai schema
→ Cần version control workflow như một dự án code thật sự
---
Mình đang test thêm và sẽ làm video demo chi tiết.
Bạn nào tò mò, comment "n8n-as-code" bên dưới nhé 
#n8n #automation #AIagent #n8nasCode #GitOps #Cursor Ẩn bớt', 16, 6, 2, 2, 'Không có video', ARRAY['https://scontent.fsgn2-8.fna.fbcdn.net/v/t39.30808-6/703065015_122167858580972523_1906416096323346223_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GGEORlXKTfYQ7kNvwGBlS_-&_nc_oc=AdqpxraKgH-Cl8CW6XfOQe1p7MhjVEqLjmxbFELHiUcHtsCvh9hfsBO0d66I0LCu_F4&_nc_zt=23&_nc_ht=scontent.fsgn2-8.fna&_nc_gid=3bJN-3wy4VPlybHathUeAg&_nc_ss=7b2a8&oh=00_Af5tDok9e058DWEJ9_H2FIlnMshYd2G_Pnnw6PIKRn5CtA&oe=6A162541']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35562579576720756/', '2026-05-22T11:52:51'::TIMESTAMPTZ, 'Glory Software Việt Nam, một phần của Tập đoàn Glory toàn cầu, đang phát triển nhanh tại Việt Nam! Chúng tôi tự hào phát triển Máy Xử Lý Tiền Mặt thông minh và đáng tin cậy, giúp doanh nghiệp xử lý tiền mặt nhanh chóng, hiệu quả, và an toàn.', 6, 2, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/704766906_3326754457492668_6421488099790781127_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=JVw73TP_Q18Q7kNvwG-QuAZ&_nc_oc=AdowBEVixFyx7uBMJhEmvVRQ4YAOnTCIx0BI295sXDxfaao6rh5oHg2BLuFrSh8YxRs&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=noZn1iuen5qjwV6aHaffsQ&_nc_ss=7b2a8&oh=00_Af4D067yRZWdYWe-D8Q7MkNP0EvU6jbaofYUqxXiUfocjQ&oe=6A161137']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - Old', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35559694743675906/', '2026-05-22T20:11:46'::TIMESTAMPTZ, 'Dạ cho mik hỏi, ở đây có ai làm công ty haibazo chưa ạ, cho em xin review với ạ', 34, 8, 13, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2765427277164382/', '2026-05-22T20:11:46'::TIMESTAMPTZ, 'Cho hỏi chỗ Aeon Đà Nẵng sắp khai trương, ko biết có tuyển vị trí IT ko ạ, cảm ơn ạ', 316, 84, 86, 20, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/976127631940039/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'SOTATEK AI TEAM ĐANG TÌM ĐỒNG ĐỘI!
 Vị trí: AI Engineer / AI Solution Provider
 Lĩnh vực: Computer Vision
 Cấp độ: Intern 
 Fresher 
 Junior 
 Mid 
 Senior
Chỉ cần đam mê với AI, biến những yêu cầu hóc búa từ phía khách hàng thành sản phẩm hoàn thiện.
 Yêu cầu: Python + PyTorch + đam mê CV (tùy level)
 Lưu ý: Tất cả ứng viên đều cần hoàn thiện Home Assessment
 Inbox mình để nhận JD + Assessment chi tiết!
Email: duy.hoang@sotatek.com Ẩn bớt', 66, 21, 12, 7, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/703862101_2113731519198253_4060419091167621937_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TYdYcJxVmTkQ7kNvwFAMlXC&_nc_oc=Adp9uUMcsJiWx94vs37yEbOdE0d2JDEVMN6pR24xlvr__GAbh756KPq0VluKDRC4Ac4&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=SZQbmGz39KjXH814aVefzg&_nc_ss=7b2a8&oh=00_Af7kELb0evAtQRnZ1d8Ztbavq3yJhjMJHowESTo0IBymAg&oe=6A1749C3']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35570608855917828/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Ở Đà Nẵng có công ty tuyển fresher Java Springboot Dev mới ra trường không kinh nghiệm không ạ. Ngoại ngữ em có tiếng Nhật và tiếng Anh giao tiếp ổn ạ.', 23, 9, 7, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2765781493795627/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Mọi người cho em hỏi muốn học devops ở đà nẵng, dạy buổi tối có chỗ nào dạy oke không ạ', 38, 6, 16, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/979569381635480/', '2026-05-23T12:06:04'::TIMESTAMPTZ, '[Xin phép ad]
Mình lập nhóm dạy Tiếng Anh Giao Tiếp Free cho bạn SỢ TIẾNG ANH. Y/c nghiêm túc. KO có học phí nên ai cần đki nhé.', 11, 1, 5, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2765781493795627/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Mọi người cho em hỏi muốn học devops ở đà nẵng, dạy buổi tối có chỗ nào dạy oke không ạ', 39, 7, 16, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35570608855917828/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Ở Đà Nẵng có công ty tuyển fresher Java Springboot Dev mới ra trường không kinh nghiệm không ạ. Ngoại ngữ em có tiếng Nhật và tiếng Anh giao tiếp ổn ạ.', 23, 9, 7, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'https://www.facebook.com/groups/hotron8n/posts/1009003704821197/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Mình cần làm hệ thống n8n + api auto đăng bài lên hàng trăm page fb độc lập, e quản lý bằng GPM mỗi profile gồm 1 via+1 page+1proxy', 7, 1, 3, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1488411932764786/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'm đang có web này cần clone tư vấn m với', 1120, 28, 546, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28073285478926601/', '2026-05-23T12:06:04'::TIMESTAMPTZ, 'Mình cần làm một trang Web để bán hàng online thời trang. Chi phí vừa phải thôi ạ', 559, 57, 59, 128, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/976127631940039/', '2026-05-23T19:22:07'::TIMESTAMPTZ, 'SOTATEK AI TEAM ĐANG TÌM ĐỒNG ĐỘI!
 Vị trí: AI Engineer / AI Solution Provider
 Lĩnh vực: Computer Vision
 Cấp độ: Intern 
 Fresher 
 Junior 
 Mid 
 Senior
Chỉ cần đam mê với AI, biến những yêu cầu hóc búa từ phía khách hàng thành sản phẩm hoàn thiện.
 Yêu cầu: Python + PyTorch + đam mê CV (tùy level)
 Lưu ý: Tất cả ứng viên đều cần hoàn thiện Home Assessment
 Inbox mình để nhận JD + Assessment chi tiết!
Email: duy.hoang@sotatek.com Ẩn bớt', 119, 23, 24, 16, 'Không có video', ARRAY['https://scontent.fdad1-3.fna.fbcdn.net/v/t39.30808-6/703862101_2113731519198253_4060419091167621937_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TYdYcJxVmTkQ7kNvwFpcHpS&_nc_oc=AdrVw0HBjjZyQ3Uv9Qa8ze3sRhG1ZOZ68c_g9KV3Kix1Nr8JvtpfkTT3iNz_IFW63ow&_nc_zt=23&_nc_ht=scontent.fdad1-3.fna&_nc_gid=9RSV8uw5Q23Pgc6-9DBaxw&_nc_ss=7b2a8&oh=00_Af69ZxasYvzmVHt_4skamVfUwiluw3ifhjKdthoZAz6ttA&oe=6A178203']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/976127631940039/', '2026-05-23T13:23:20'::TIMESTAMPTZ, 'SOTATEK AI TEAM ĐANG TÌM ĐỒNG ĐỘI!
 Vị trí: AI Engineer / AI Solution Provider
 Lĩnh vực: Computer Vision
 Cấp độ: Intern 
 Fresher 
 Junior 
 Mid 
 Senior
Chỉ cần đam mê với AI, biến những yêu cầu hóc búa từ phía khách hàng thành sản phẩm hoàn thiện.
 Yêu cầu: Python + PyTorch + đam mê CV (tùy level)
 Lưu ý: Tất cả ứng viên đều cần hoàn thiện Home Assessment
 Inbox mình để nhận JD + Assessment chi tiết!
Email: duy.hoang@sotatek.com Ẩn bớt', 122, 23, 24, 17, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/703862101_2113731519198253_4060419091167621937_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TYdYcJxVmTkQ7kNvwFAMlXC&_nc_oc=Adp9uUMcsJiWx94vs37yEbOdE0d2JDEVMN6pR24xlvr__GAbh756KPq0VluKDRC4Ac4&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=lq19l5PEkBAxOtoHrkd1rw&_nc_ss=7b2a8&oh=00_Af7aHzNqNmCGJlBHlzIlbBkwgRKciKZTJksDuci9gXfbMw&oe=6A178203']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/976127631940039/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'SOTATEK AI TEAM ĐANG TÌM ĐỒNG ĐỘI!
 Vị trí: AI Engineer / AI Solution Provider
 Lĩnh vực: Computer Vision
 Cấp độ: Intern 
 Fresher 
 Junior 
 Mid 
 Senior
Chỉ cần đam mê với AI, biến những yêu cầu hóc búa từ phía khách hàng thành sản phẩm hoàn thiện.
 Yêu cầu: Python + PyTorch + đam mê CV (tùy level)
 Lưu ý: Tất cả ứng viên đều cần hoàn thiện Home Assessment
 Inbox mình để nhận JD + Assessment chi tiết!
Email: duy.hoang@sotatek.com Ẩn bớt', 112, 34, 21, 12, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/703862101_2113731519198253_4060419091167621937_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=VC55c4Lm7_8Q7kNvwGoHyqG&_nc_oc=AdpRhYDd36QzN_tF8Z-KBa3cnIFXsx57THemjbKbPGF1BRFe9i66SpSAubR9Vq8mqJ8&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=knopMDtQXGKMH5EbQu3qSw&_nc_ss=7b2a8&oh=00_Af4S6e15NDdKHERkyGU8o_U_R5OLHKDAqqZAjsbzQpz0wA&oe=6A189B43']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35592843053694408/', '2026-05-24T12:57:13'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC mở nhiều vị trí cho dự án Philippines size team hơn 100 người:
02 Middle/ Senior Frontend Developer (Angular) - upto 36M gross
02 Middle Manual Tester - upto 25M gross
01 Fresher Manual Tester - upto 6M (ký HĐ 3 tháng, sau đó lên chính thức)
 Quyền lợi:
Thời gian làm việc linh hoạt từ T2-T6
Review lương 2 lần/ năm, package năm hấp dẫn
BHSK cao cấp cho nhân viên
Có cơ hội lên nhân viên chính thức sau 3-6 tháng
Tham gia các dự án lớn với khách hàng Global, ecommerce domain
Chỉ cần bạn:
Tiếng Anh giao tiếp tốt trong môi trường global
Min 2 năm KN liên quan trở lên
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 28, 12, 2, 4, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2766634433710333/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'Chào các anh chị,
Em sv năm 3 , em định học khoá fullstack để nâng cấp kiến thức và đi làm, em tìm hiểu vài trung tâm thì đa số là khoá 6-7 tháng xong từ cơ bản đến nâng cao, đi làm được.
Nhưng trong trường  em cũng có 1 thầy mở lớp dạy thêm, khoá fullstack chỉ 3  tháng xong, nếu chưa xong thì được học thêm 1 tháng miễn phí và kết thúc khoá.
E thắc mắc là bên ngoài dạy 6-7 tháng mà sao thầy dạy chỉ 3 tháng xong thì có đủ không ạ?
Em hơi khó hiểu khoản này 1 chút,  nhờ các anh chị có kinh nghiệm tư vấn giúp với ạ.
Em cám ơn. Ẩn bớt', 118, 26, 46, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang/posts/1030482232994285/', '2026-05-24T12:57:13'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC mở nhiều vị trí cho dự án Philippines size team hơn 100 người:
02 Middle/ Senior Frontend Developer (Angular) - upto 36M gross
02 Middle Manual Tester - upto 25M gross
01 Fresher Manual Tester - upto 6M (ký HĐ 3 tháng, sau đó lên chính thức)
 Quyền lợi:
Thời gian làm việc linh hoạt từ T2-T6
Review lương 2 lần/ năm, package năm hấp dẫn
BHSK cao cấp cho nhân viên
Có cơ hội lên nhân viên chính thức sau 3-6 tháng
Tham gia các dự án lớn với khách hàng Global, ecommerce domain
Chỉ cần bạn:
Tiếng Anh giao tiếp tốt trong môi trường global
Min 2 năm KN liên quan trở lên
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 4, 2, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1976648636321657/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'FSOFT TUYỂN NHÂN VIÊN XỬ LÝ ẢNH/DỮ LIỆU. Không y/c kinh nghiệm. Chỉ cần biết sử dụng máy vi tính

 ChiNM1@fpt.com', 16, 5, 4, 1, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', 'https://www.facebook.com/groups/486674299325438/posts/1690839918908864/', '2026-05-24T12:57:13'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC mở nhiều vị trí cho dự án Philippines size team hơn 100 người:
02 Middle/ Senior Frontend Developer (Angular) - upto 36M gross
02 Middle Manual Tester - upto 25M gross
01 Fresher Manual Tester - upto 6M (ký HĐ 3 tháng, sau đó lên chính thức)
 Quyền lợi:
Thời gian làm việc linh hoạt từ T2-T6
Review lương 2 lần/ năm, package năm hấp dẫn
BHSK cao cấp cho nhân viên
Có cơ hội lên nhân viên chính thức sau 3-6 tháng
Tham gia các dự án lớn với khách hàng Global, ecommerce domain
Chỉ cần bạn:
Tiếng Anh giao tiếp tốt trong môi trường global
Min 2 năm KN liên quan trở lên
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27066075993008596/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'Chúng tôi là APA Tech, một công ty công nghệ được lãnh đạo bởi những người công nghệ. Làm việc vui vẻ tạo ra những sản phẩm tốt hơn! Chúng tôi tìm kiếm những cá nhân sẵn sàng làm việc chăm chỉ và nỗ lực để cải thiện cá nhân ở một cấp độ cao hơn. Chúng tôi ưu tiên sự cam kết và phát triển cá nhân so với cách tiếp cận cân bằng công việc và cuộc sống thông thường.', 31, 4, 3, 7, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/705018251_122094936129341551_9216478562515602378_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=K2gjtPi_ObkQ7kNvwH2NIcD&_nc_oc=AdrMkXUwIoYuZZHxV4yA1QYKV_nY1Uuie_c-J89I3r8rEJACYAFZ9XkJSmNSUZNIj2Q&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=v5UAp3vD8u1tsFccSnPOuA&_nc_ss=7b2a8&oh=00_Af7ef4VXhCtNCWYRTKtv6xh4Lr3jiAhzso8NF1ON5vPpkQ&oe=6A18BC77']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/980840444841707/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'Cần tìm học viên tham gia khóa Lập Trình Game. Học và làm trên dự án thực tế, đào tạo lại từ đầu
Được hỗ trợ việc làm ngay sau học', 6, 2, 2, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2766634433710333/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'Chào các anh chị,
Em sv năm 3 , em định học khoá fullstack để nâng cấp kiến thức và đi làm, em tìm hiểu vài trung tâm thì đa số là khoá 6-7 tháng xong từ cơ bản đến nâng cao, đi làm được.
Nhưng trong trường  em cũng có 1 thầy mở lớp dạy thêm, khoá fullstack chỉ 3  tháng xong, nếu chưa xong thì được học thêm 1 tháng miễn phí và kết thúc khoá.
E thắc mắc là bên ngoài dạy 6-7 tháng mà sao thầy dạy chỉ 3 tháng xong thì có đủ không ạ?
Em hơi khó hiểu khoản này 1 chút,  nhờ các anh chị có kinh nghiệm tư vấn giúp với ạ.
Em cám ơn. Ẩn bớt', 218, 26, 27, 46, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35592843053694408/', '2026-05-24T12:57:13'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC mở nhiều vị trí cho dự án Philippines size team hơn 100 người:
02 Middle/ Senior Frontend Developer (Angular) - upto 36M gross
02 Middle Manual Tester - upto 25M gross
01 Fresher Manual Tester - upto 6M (ký HĐ 3 tháng, sau đó lên chính thức)
 Quyền lợi:
Thời gian làm việc linh hoạt từ T2-T6
Review lương 2 lần/ năm, package năm hấp dẫn
BHSK cao cấp cho nhân viên
Có cơ hội lên nhân viên chính thức sau 3-6 tháng
Tham gia các dự án lớn với khách hàng Global, ecommerce domain
Chỉ cần bạn:
Tiếng Anh giao tiếp tốt trong môi trường global
Min 2 năm KN liên quan trở lên
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 29, 13, 2, 4, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1488411932764786/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'm đang có web này cần clone tư vấn m với', 1124, 28, 548, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28074334092155073/', '2026-05-24T12:57:13'::TIMESTAMPTZ, 'Tình trạng web liên tục gặp vấn đề.
Nên mình cần tìm một bạn chỉnh sửa/ lam Website uy tín. Bạn nào có người quen giới thiệu mình với ạ.
Xin cảm ơn ạ. 
Yêu cầu có kiến thức về xe, và cam kết hỗ trợ lâu dài.
Website: xetai-miennam.vn', 266, 25, 26, 63, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/977277348491734/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'em hiện tại đang là sinh viên năm 2, chưa có ý định xin việc nhưng muốn tham khảo ý kiến anh chị đi trước để cải thiện CV ạ (em chỉ xin nhận xét và đóng góp nên em không để thông tin cá nhân, trường em học nằm trong khối VNU-HCM nhưng xin phép ko để cụ thể tên trường)
- Về chứng chỉ tiếng Anh, em để cuối năm sau mới thi, em đang ôn luyện, khi làm test thì được khoảng 5.5 - 6.0 nhưng chưa thi thật nên em để trống
Em học ngành hơi thiên hướng khác so với mảng AI và đây là ngành ngách nên chưa nắm rõ về thị trường lao động, mọi người cho em xin đánh giá và cải thiện, các anh chị đi trước cho em lời khuyên với ạ, em cảm ơn Ẩn bớt', 335, 84, 85, 27, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/704446757_2065602417717169_5354054378007818914_n.png?stp=dst-png_s640x640&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=WNoxNYXPk94Q7kNvwGF3uSL&_nc_oc=AdqItKLxSRaJioCBo6FmwgViyuBNckI1M5zPnrmWl8rYNP7aOjE6fld_dsPXNnr2G1w&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=AFfnHXX9o76TuyXRXmVbcQ&_nc_ss=7b2a8&oh=00_Af489QrZ3IKcsz76IVodwIea8lG6A7BVAE8Fp1tmO1Kkmg&oe=6A1A05C7']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35560984080213639/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'One Tech Stop Vietnam đang mở rộng đội ngũ với nhiều cơ hội hấp dẫn tại Đà Nẵng & Hồ Chí Minh!
 Địa điểm:
Đà Nẵng
Hồ Chí Minh
 Open positions:
[Da Nang] Agile Delivery Manager
[Ho Chi Minh] QA Engineer
[Da Nang / Ho Chi Minh] UI/UX Designer
[Da Nang & Ho Chi Minh] Technical Architect
[Da Nang] Scrum Master
[Da Nang] Full-Stack Developer (ReactJS/ NodeJS)
[Ho Chi Minh] Full-Stack Developer (ReactJS/ NodeJS)
 Benefits nổi bật:
Môi trường làm việc quốc tế, năng động
Cơ hội phát triển cùng các dự án công nghệ hiện đại
Chính sách phúc lợi & work-life balance hấp dẫn
 Apply ngay tại: https://itviec.com/companies/one-tech-stop-vietnam-company-ltd', 89, 27, 28, 2, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2768212826885827/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Đừng đăng tuyển dụng ảo nữa được không các Hr ơi
Chuyện là công ty F,open tuyển 20 slot base IT làm 247,đăng tuyển rầm rộ xong HR bảo tuyển nội bộ trong công ty chưa có quyết định tuyển từ bên ngoài vào :))) vậy thì đăng trong công ty thôi đăng tuyển dụng bên ngoài làm gì ?', 466, 114, 116, 40, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', 'https://www.facebook.com/groups/533932866958136/posts/2904264533258279/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Cho e hỏi có ai tuyển sinh viên cao đẳng it mới ra trường không ạ', 9, 1, 4, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang/posts/1031689032873605/', '2026-05-25T13:30:08'::TIMESTAMPTZ, '[QUẢNG TRỊ]

CHÚNG MÌNH CẦN TUYỂN GẤP TESTER


 Quyền lợi :

• Lương thỏa thuận theo năng lực
• Review lương 2 lần/năm

• Được cung cấp đầy đủ thiết bị làm việc

• Các chế độ phúc lợi theo quy định của Luật lao động (Bảo hiểm xã hội, Nghỉ phép năm, Ngày lễ, Lương thưởng T13)

• Ăn trưa miễn phí tại công ty


 Yêu cầu : Tối thiểu 1 năm kinh nghiệm ở vị trí tương đương


 Thời gian làm việc : Thứ 2 - Thứ 6


 Địa chỉ : Đồng Hới, Quảng Trị

Ứng viên quan tâm ib để nhận JD hoặc gửi CV qua mail hr@inmobivn.com/zalo 0345760916 (Ms Huế)', 3, 3, 0, 0, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/707454526_1036109448750017_328605468669042004_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=RTW3bLYxiugQ7kNvwFWYhUd&_nc_oc=Adr_89DSKBYi-pNTCChx6WjgTU3JlrZdYIL11Im4Lqxhlvw-6-rbHG_ND5A2agdejBk&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=UN-9zpehvwdQwOmyhhCxIg&_nc_ss=7b2a8&oh=00_Af5stIkEEK9kqjP5lFNf3EVLip69A77ONzeCyxX-183UMg&oe=6A19F755']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1976700089649845/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'FPT Software tuyển 20 CTV Xử lý hình ảnh
CÔNG VIỆC: Gắn nhãn đóng khung, chấm điểm, tô màu cho các đối tượng xuất hiện trên đường bằng tool của khách hàng. Đối tượng bao gồm : lane đường, xe ô tô, người, các loại xe hai bánh, đối tượng động, đối tượng tĩnh khác…
YÊU CẦU
- Thành thạo vi tính, có kỹ năng cơ bản về tin học văn phòng.
- Cần cù, chịu khó và có thể làm việc fulltime tại công ty và OT khi được yêu cầu
- Tốt nghiệp từ Trung Cấp trở lên

Làm việc tại FPT Complex
CV apply: HaTTT12@fpt.com', 15, 3, 6, 0, 'Không có video', ARRAY['https://scontent.fsgn2-10.fna.fbcdn.net/v/t39.99422-6/703300388_1519985682467699_5519701759607385650_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=109&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=v30bbXa39DAQ7kNvwHxRuaf&_nc_oc=AdqBPG2zYQxmF3Cxio4uDwLP64qL53uxqINjw6OCgnSqYjio0RsgABEHxu3SF-1KZes&_nc_zt=14&_nc_ht=scontent.fsgn2-10.fna&_nc_gid=dFuZNqzTiy5IHtwPJyh1wg&_nc_ss=7b2a8&oh=00_Af703SCRrJILhevhhU8Y21A2g2OWxLLevRMSJ54_6mHXcA&oe=6A19EA85']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'https://www.facebook.com/groups/3614844702129254/posts/4444983915781991/', '2026-05-25T13:30:08'::TIMESTAMPTZ, '[Tokyo] Em tìm các bác BrSE | Offer Upto 700Man| PV Online 01 vòng duy nhất
Rikai - Công ty công nghệ chuyên về phát triển phần mềm và cung cấp dịch vụ IT cho thị trường Nhật Bản và quốc tế bên em cần tìm BrSE. Đóng vai trò làm cầu nối giữa khách hàng Nhật Bản và đội dự án Offshore ở Việt Nam, giải quyết các vấn đề phát sinh trong dự án và các vấn đề sau khi bàn giao. Có quyền đóng góp solution, suggest ý tưởng cho dự án.
Process nhanh gọn 1 vòng là có Offer.
Quyền lợi:
Thưởng 2 lần/năm.
Tăng lương 1 lần/năm.
Hỗ trợ tiền nhà, NPT, con cái
Vé máy bay khứ hồi về Việt Nam
Các chế độ phúc lợi khác như tiền mừng, hiếu hỷ, thăm viếng.
Chế độ thai sản tại Nhật và hưởng phụ cấp theo chính sách bảo hiểm của chính phủ Nhật
Các bác BrSE có base tech quan tâm ping em gửi Job ạ', 3, 1, 1, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/707341572_1762048111458062_8019621238313528245_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=MKXBgUWPouIQ7kNvwGycbbn&_nc_oc=AdpOArlQ3N7q6KwirJ0uFLUhYcqQFQk3etZKZIukAyiRjo4XM44UjWvjcVBJIWfdnvk&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=V6_M8Xw1NnyFnntJWa1qWw&_nc_ss=7b2a8&oh=00_Af4_zNgyXdkOTtoCDw7be7SLeTZb0KVnsom1ja3PUpW-5Q&oe=6A19E729']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27110423561907172/', '2026-05-25T13:30:08'::TIMESTAMPTZ, '[Đà Nẵng] Các vị trí technical đang mở tuyển | Benefits hấp dẫn
Công ty ITO từ Thụy Sĩ - SmartDev LLC - đang tuyển các vị trí technical:
 Delivery Manager | 5+ YoE
 Senior Solution Architect | 5+ YoE
 Senior Fullstack Developer (FE Strong) | 7+ YoE
 Senior AWS Developer | 3-5+ YoE
 Senior DevOps Engineer | 7+ YoE
 Senior QA Engineer (Manual & Automation) | 5+ YoE
Môi trường đa quốc gia, 20 ngày nghỉ phép năm, được cấp Claude Team cho công việc
Anh chị quan tâm inb ngay để em hỗ trợ nha! Ẩn bớt', 6, 2, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/707561606_1548906550542891_1677110201193233333_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=aN6rvr4T8tIQ7kNvwEPFVtD&_nc_oc=AdrJkvCALs7RYdwZo0uoZNSYZROjxdWjh5E7z3iW5jOk2Bv3VntkoQpJ3Dpr7S9lfJA&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=HMHbsrLzl-2HWf2SyC0GSw&_nc_ss=7b2a8&oh=00_Af6raHwyJRm3ZmmBxdNctTPosBL6WbaB6cq10CCQNxaiFg&oe=6A1A1DAB']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'https://www.facebook.com/groups/myprofiles/posts/26958654683777769/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Không có nội dung', 9, 3, 3, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/981618264763925/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'HÀ NỘI – TUYỂN DỤNG IT - PHỎNG VẤN NHANH
Các dự án bên em đang tuyển thêm nhân sự trong tháng 6, ưu tiên ứng viên sẵn sàng join sớm.


 [Keangnam – HN]
• NodeJS Developer
• QA Manual
- Từ 3+ năm kinh nghiệm
- Ưu tiên onboard trong tháng 6
----------------------------------

 [Hai Bà Trưng – HN]
• Fullstack Developer (ReactJS + Java)
- Từ 3–4 năm kinh nghiệm
- Ưu tiên ứng viên có thể đi làm ASAP
----------------------------------

 [Láng Hạ – HN]
• Java Developer
• BA
• QA
- Từ 2–5 năm kinh nghiệm
- Yêu cầu tốt nghiệp Đại học
- Có background Banking/Fintech là lợi thế

=> Offer thương lượng, không yc tiếng anh, process nhanh

 Inbox/contact 0332.446.163 em hỗ trợ 24/7!', 1, 1, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2768212826885827/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Đừng đăng tuyển dụng ảo nữa được không các Hr ơi
Chuyện là công ty F,open tuyển 20 slot base IT làm 247,đăng tuyển rầm rộ xong HR bảo tuyển nội bộ trong công ty chưa có quyết định tuyển từ bên ngoài vào :))) vậy thì đăng trong công ty thôi đăng tuyển dụng bên ngoài làm gì ?', 481, 116, 118, 43, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', 'https://www.facebook.com/groups/1358071568620767/posts/1608682626892992/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Mình cần crawl data trên web về thành dữ liệu thô như excel
Khoảng 500k trang, ai có kinh nghiệm ib ạ', 21, 3, 9, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35560984080213639/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'One Tech Stop Vietnam đang mở rộng đội ngũ với nhiều cơ hội hấp dẫn tại Đà Nẵng & Hồ Chí Minh!
 Địa điểm:
Đà Nẵng
Hồ Chí Minh
 Open positions:
[Da Nang] Agile Delivery Manager
[Ho Chi Minh] QA Engineer
[Da Nang / Ho Chi Minh] UI/UX Designer
[Da Nang & Ho Chi Minh] Technical Architect
[Da Nang] Scrum Master
[Da Nang] Full-Stack Developer (ReactJS/ NodeJS)
[Ho Chi Minh] Full-Stack Developer (ReactJS/ NodeJS)
 Benefits nổi bật:
Môi trường làm việc quốc tế, năng động
Cơ hội phát triển cùng các dự án công nghệ hiện đại
Chính sách phúc lợi & work-life balance hấp dẫn
 Apply ngay tại: https://itviec.com/companies/one-tech-stop-vietnam-company-ltd', 89, 27, 28, 2, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1495085478764098/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Ai code web theo yêu cầu cơ bản giúp mình không chủ yếu seo lên đề xuất là được ạ', 251, 26, 27, 57, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28087443634177452/', '2026-05-25T13:30:08'::TIMESTAMPTZ, 'Cần tìm đơn vị uy tín thiết kế web chuyên nghiệp
Khoảng 8000 sản phẩm, mình cần đảm bảo tốc độ load,
Wp đang có nhưng ko đảm bảo', 556, 50, 52, 134, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/978104968408972/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'Tuyển dụng: IT Support Technician (Fresher)
Bạn yêu thích IT Support và muốn phát triển trong môi trường chuyên nghiệp? Đây là cơ hội dành cho bạn 
 Hỗ trợ người dùng xử lý các sự cố IT cơ bản
 Cài đặt, cấu hình laptop, máy in, thiết bị văn phòng
 Hỗ trợ hệ thống Windows, Microsoft 365, LAN/Wi-Fi
 Làm việc với ticket system và phối hợp cùng System/Network Team
 Dành cho:
- Sinh viên năm cuối hoặc Fresher ngành CNTT
- Có kiến thức cơ bản về Windows, mạng máy tính
- Giao tiếp tốt, ham học hỏi, tinh thần hỗ trợ khách hàng
 Không yêu cầu kinh nghiệm hoặc dưới 1 năm kinh nghiệm
Địa điểm: Lotte Center - Liễu Giai - Hà Nội
 Inbox hoặc gửi CV để biết thêm chi tiết! Ẩn bớt', 134, 28, 29, 16, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35627768576868522/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'VIETTEL SOLUTIONS ĐÀ NẴNG TUYỂN DỤNG NHIỀU VỊ TRÍ.
Ai có nhu cầu ib m nhé. Ẩn bớt', 79, 32, 1, 15, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/707012667_10215222499751310_1077698830782930391_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=jL1p-jWF9rIQ7kNvwHZOHmH&_nc_oc=AdoRzoU0pJ5xGifpKaeDdXgLANimtAf9PQecmGZU1Lf9VGy171Ce7lCMOM9bW_SZxHk&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=VvFEQGZ8VYX8l0G8rBTRtw&_nc_ss=7b2a8&oh=00_Af48RCdzk4zGcv3Fj6dey-WmMv9Y0hal2Mh7LTf9yPL-zQ&oe=6A1B60A6']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2769040003469776/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'HTX ASIA DA NANG 
TUYỂN DỤNG : NHÂN VIÊN IT : QUẢN LÝ DỮ LIỆU & HỆ THỐNG
MÔ TẢ CÔNG VIỆC : 
- Quản lý , xây dựng , cập nhật và tối ưu dữ liệu trên hệ thống
- Theo dõi, kiểm tra và đảm bảo tín chính xác , nhất quán của dữ liệu 
- Xây dựng báo cáo, thống kê, dashboard phục vụ vận hành và quản trị 
- Phối hợp với các phòng ban để triển khai và cải tiến hệ thông 
- Đề xuất giải pháp nâng cao hiệu quả quản lý dữ liệu và hệ thống 
YÊU CẦU CÔNG VIỆC : 
- Có tư duy hệ thống, cẩn thận, logic, làm việc có quy trình rõ ràng
- Sử dụng tốt Excel, Google Sheets, Google Docs,.... ( thành thạo công cụ IT là lợi thế ) 
- Muốn gắn bó lâu dài, phát triển theo hướng vận hành - quản lý hệ thống.
- Độ tuổi : 20-40 ( NAM ) 
QUYỀN LỢI ĐƯỢC HƯỞNG : 
- Lương : 7.500.000 đ  + 1.000.000đ trách nhiệm + thưởng tháng lương 13. 
- Tăng lương theo năng lực 
- Ký HĐLĐ và hưởng đầy đủ quyền lợi theo Luật Lao động:
- Thưởng lễ, Tết
- Các chế độ BHXH, BHYT, BHTN theo đúng quy định Luật lao động 
THÔNG TIN LIÊN HỆ: 
- Địa điểm làm việc: 476 Hùng Vương, Phường Hương Trà, Tp Đà Nẵng 
- Liên hệ: Mr. Hải: 034 8888 789 
- Email: asiahtx@gmail.com - htxasiadanang@gmail.com Ẩn bớt', 53, 13, 5, 10, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/708277470_980083324922400_418452354658991328_n.png?stp=dst-png_p526x296&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=RoSGJLeAw9UQ7kNvwHqVd13&_nc_oc=AdrdhIib0geN-w4srH9A37t9TVoX--K7U_5OHeojkNLsnGRes9KMGbx4QzC37aQqzJE&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=ngW7wd1wLfodVHq1FQNLbg&_nc_ss=7b2a8&oh=00_Af5c1iwDA5qZjfR5B0qzJemTuIJTB2nwnOWpstWBoaHEKw&oe=6A1B3B8B']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', 'https://www.facebook.com/groups/533932866958136/posts/2905723613112371/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC -Tuyển dụng FE Developer (Vuejs/Javascript/NextJS)
 Quyền lợi:
Lương: upto 33M gross
Làm việc từ thứ 2 - thứ 6 (ko phạt đi muộn)
Có bảo hiểm sức khỏe cao cấp
Môi trường đa quốc gia, tham gia vào dự Global, domain hàng không
Review lương 2 lần/ năm, du lịch, quà ngày lễ,....
 Chỉ cần bạn:
Có min 2 năm KN về Front-end (Nextjs, Vuejs, Angular, Javascript, HTML...)
Tiếng Anh giao tiếp tốt là bắt buộc
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 21, 7, 1, 4, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang', 'https://www.facebook.com/groups/gioithieuvieclamcnttdanang/posts/1032630726112769/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[Hybrid HCM/ĐN] Dự án lớn của US buildteam cần thêm 2 Senior UXUI (Strong UX), English giao tiếp tốt. OFFER 45-55M. Inbox ạ', 7, 7, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1981644609155393/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'Không có nội dung', 4, 2, 1, 0, 'Không có video', ARRAY['https://scontent.fsgn2-8.fna.fbcdn.net/v/t39.30808-6/708304920_4018215071810893_3306500615720571123_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=Jg5iZWLTUSQQ7kNvwHBC5jr&_nc_oc=Adq9pm8xLbUNdC-2a4dRm5ZmC2Rb3ntkc6c79w8jaxydphzyJJEcnn_iRrHdZJpKvLw&_nc_zt=23&_nc_ht=scontent.fsgn2-8.fna&_nc_gid=s7-KGV6xEtEYkQm13wFctg&_nc_ss=7b2a8&oh=00_Af64Fh9vvQN-7kUrMATpFoANEedw1L7b3fPPvC03At7h6g&oe=6A1B5648']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev/posts/4391242827829898/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[NYB] TUYỂN SENIOR FULL STACK ENGINEER 
Up to 2000$ - 45-47 Tran Xuan Soan HN
• 
 Job: Xây dựng nền tảng SaaS chạy AI/ML, thiết kế UI no-code/low-code phục vụ nghiên cứu dược phẩm cùng đội ngũ quốc tế.
• 
 Yêu cầu: 7+ năm kinh nghiệm; thạo React/Next.js, Python (FastAPI)/Node.js; có kinh nghiệm Docker/AWS, xử lý dữ liệu lớn/AI; thạo tiếng Anh.
• 
 Quyền lợi: Lương cạnh tranh; làm T2-T6 tại 45-47 Trần Xuân Soạn HN; phát triển sản phẩm công nghệ đột phá, tác động lớn đến y tế toàn cầu.
• 
 Apply: Gửi CV về office@nanyangbiologics.com (Tiêu đề: [NYB] Senior Full Stack Engineer_Họ tên).
#NanyangBiologics #FullStackEngineer #SaaS #ReactJS #FastAPI #TechJobs #Hiring', 7, 3, 2, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'https://www.facebook.com/groups/880353022746185/posts/2154459962002145/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[Đà Nẵng] Dự án mở rộng công ty mình cần chiêu mộ BrSE/PM tiếng Nhật giao tiếp tốt. Inbox em nha', 5, 1, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/705923451_2050263812229393_4331554546643963016_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TKrKsvROp_oQ7kNvwGB0l7a&_nc_oc=AdpCyuP1TpEFZJx1gpgEZZs_Sz71bbuWrIB-uybhHWD4BgZ6n_YRaQ9i-B9T06lbom4&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=c6tLSxBiDgsAMALA607PZA&_nc_ss=7b2a8&oh=00_Af5PbPnD70PiZATpXFw8u1qKwrHftp6zsx8lWvKgAcUD-Q&oe=6A1B5E9C']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'https://www.facebook.com/groups/3614844702129254/posts/4445802072366842/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'Hybrid ĐN/HCM_OFFER 6,500 USD | #Manual #Tester | #UIUX #Designer
List Job IT cho các ace ở ĐN và HCM với chế độ làm việc #Hybrid lên văn phòng 1-3 ngày/tuần cùng các Benefits siêu hấp dẫn tại các vị trí:

 #Middle/ #Senior #Manual #Tester 
 OFFER 30-45M

Senior #UI/ #UX #Designer 
 OFFER 40-50M

Middle Senior #Fullstack (.NET + Angular) #developer 
 OFFER 35-55M

#React #Native #Architect 
 UPTO 4,000 USD

#AI #Solutions #Architect 
 UPTO 6,500 USD


 BENEFITS:

 Thử việc 100% lương

Flexible time working, Lên văn phòng 1-3 ngày/tuần

Package 13 -15 tháng lương/năm

BHXH full lương, BHSK nâng cao cho cả người thân


 
 Ib trực tiếp hoặc liên hệ zalo để em hỗ trợ nhanh nhất nha', 7, 3, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/706920336_4220367818293351_935348578699900397_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=9uX7VpmII3IQ7kNvwGbe9VO&_nc_oc=AdrFtBdn_ekfUZa32-fM9GrLZSj2OF4jPjfs4EOziJYU7Jz0bMurXZZ6yhlVNtB67fg&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=9L4dh6M3bmwxmKHARtCl4A&_nc_ss=7b2a8&oh=00_Af4Jv_fQRmeRYq280Gwu0ziCnxHu5DXmUZgLZShugHMANA&oe=6A1B71BE']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', 'https://www.facebook.com/groups/486674299325438/posts/1692444535415069/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[Đà Nẵng] SmartOSC -Tuyển dụng FE Developer (Vuejs/Javascript/NextJS)
 Quyền lợi:
Lương: upto 33M gross
Làm việc từ thứ 2 - thứ 6 (ko phạt đi muộn)
Có bảo hiểm sức khỏe cao cấp
Môi trường đa quốc gia, tham gia vào dự Global, domain hàng không
Review lương 2 lần/ năm, du lịch, quà ngày lễ,....
 Chỉ cần bạn:
Có min 2 năm KN về Front-end (Nextjs, Vuejs, Angular, Javascript, HTML...)
Tiếng Anh giao tiếp tốt là bắt buộc
Địa điểm làm việc: Công viên Công nghệ Phần mềm số 2, đường Như Nguyệt, Phường Hải Châu, TP. Đà Nẵng
 Gửi CV ứng tuyển tại email: huonghtt1@smartosc.com
Các bạn ứng viên quan tâm job vui lòng ib mình nha, mình gửi JD chi tiết. Cảm ơn các bạn', 7, 2, 1, 1, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27116860044596857/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[Đà Nẵng] TUYỂN DỤNG Vị trí: QA Tester (fresher)
 Hình thức: Full-time
Địa điểm: Đà Nẵng
 Mô tả công việc:
Test web/app theo yêu cầu dự án
Viết test case, checklist
Report bug và phối hợp với dev để fix lỗi
Học hỏi quy trình QA thực tế trong dự án
 Yêu cầu:
Có kinh nghiệm testing ít nhất 3 tháng
Tiếng Anh: đọc – viết
Thời gian làm việc full-time
Sinh viên CNTT đã tốt nghiệp', 29, 3, 4, 6, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/982388188020266/', '2026-05-26T13:14:30'::TIMESTAMPTZ, '[FPT SOFTWARE HÀ NỘI] TUYỂN DỤNG FRESHER EMBEDDED 
 Vị trí: Fresher Embedded
 Địa điểm: FPT Building, Cầu Giấy, Hà Nội
 Thời gian: Full-time (Thứ 2 – Thứ 6)
 Số lượng: 20 bạn
Bạn yêu thích lập trình C/C++, Embedded, IoT hay muốn phát triển trong lĩnh vực Automotive Software? Đây là cơ hội để tham gia chương trình đào tạo Fresher Embedded tại FPT Software – môi trường công nghệ hàng đầu Việt Nam 
 Nội dung đào tạo:
• C/C++, OOP, Data Structure & Algorithm
• Embedded Development với ARM Cortex-M
• UART, SPI, I2C, ADC/DAC, Autosar…
• Quy trình phát triển phần mềm chuyên nghiệp & kỹ năng mềm
 Yêu cầu:
 Sinh viên năm cuối hoặc đã tốt nghiệp các ngành CNTT, Điện tử, Cơ điện tử, Tự động hóa…
 Có base C/C++ là lợi thế
 GPA từ 2.8+
 Có thể làm việc full-time
 Quyền lợi:
 Trợ cấp đào tạo 6–8 triệu/tháng
 Sau đào tạo thu nhập trung bình 12–16M/tháng
 Làm việc tại các dự án Automotive quốc tế
 Môi trường trẻ, hiện đại, nhiều cơ hội phát triển
Cv ứng tuyển gửi về mail:
Email: linhdieunguyen123z@gmail.com', 8, 2, 3, 0, 'Không có video', ARRAY['https://scontent.fsgn2-11.fna.fbcdn.net/v/t39.30808-6/705964652_122288989754245117_1374052349659845395_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=105&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=kzxNgeYDqcYQ7kNvwEuCLl0&_nc_oc=Ado6ayMDUmdydTqSGhYiPnnsQuAakqy_7Sg3AfoKu4xrLHGaemlVlMUjiE0MIz_BrLQ&_nc_zt=23&_nc_ht=scontent.fsgn2-11.fna&_nc_gid=s0Q610ANc7f9a8ND-iRBvA&_nc_ss=7b2a8&oh=00_Af6bZJdfW_pAxKmwPa3u6d2kVTcxj1nTgJ8o4KPLKQHqLw&oe=6A1B662E']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2769040003469776/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'HTX ASIA DA NANG 
TUYỂN DỤNG : NHÂN VIÊN IT : QUẢN LÝ DỮ LIỆU & HỆ THỐNG
MÔ TẢ CÔNG VIỆC : 
- Quản lý , xây dựng , cập nhật và tối ưu dữ liệu trên hệ thống
- Theo dõi, kiểm tra và đảm bảo tín chính xác , nhất quán của dữ liệu 
- Xây dựng báo cáo, thống kê, dashboard phục vụ vận hành và quản trị 
- Phối hợp với các phòng ban để triển khai và cải tiến hệ thông 
- Đề xuất giải pháp nâng cao hiệu quả quản lý dữ liệu và hệ thống 
YÊU CẦU CÔNG VIỆC : 
- Có tư duy hệ thống, cẩn thận, logic, làm việc có quy trình rõ ràng
- Sử dụng tốt Excel, Google Sheets, Google Docs,.... ( thành thạo công cụ IT là lợi thế ) 
- Muốn gắn bó lâu dài, phát triển theo hướng vận hành - quản lý hệ thống.
- Độ tuổi : 20-40 ( NAM ) 
QUYỀN LỢI ĐƯỢC HƯỞNG : 
- Lương : 7.500.000 đ  + 1.000.000đ trách nhiệm + thưởng tháng lương 13. 
- Tăng lương theo năng lực 
- Ký HĐLĐ và hưởng đầy đủ quyền lợi theo Luật Lao động:
- Thưởng lễ, Tết
- Các chế độ BHXH, BHYT, BHTN theo đúng quy định Luật lao động 
THÔNG TIN LIÊN HỆ: 
- Địa điểm làm việc: 476 Hùng Vương, Phường Hương Trà, Tp Đà Nẵng 
- Liên hệ: Mr. Hải: 034 8888 789 
- Email: asiahtx@gmail.com - htxasiadanang@gmail.com Ẩn bớt', 55, 15, 5, 10, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/708277470_980083324922400_418452354658991328_n.png?stp=dst-png_p526x296&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=RoSGJLeAw9UQ7kNvwHqVd13&_nc_oc=AdrdhIib0geN-w4srH9A37t9TVoX--K7U_5OHeojkNLsnGRes9KMGbx4QzC37aQqzJE&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=7upm9nxlfgqd4U9xMdFOZQ&_nc_ss=7b2a8&oh=00_Af5Jaloew70GVSgdSbesbifkDs8QrQ9nzxIOcBnLuT0XEA&oe=6A1B73CB']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35627768576868522/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'VIETTEL SOLUTIONS ĐÀ NẴNG TUYỂN DỤNG NHIỀU VỊ TRÍ.
Ai có nhu cầu ib m nhé. Ẩn bớt', 81, 34, 1, 15, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/707012667_10215222499751310_1077698830782930391_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=jL1p-jWF9rIQ7kNvwHZOHmH&_nc_oc=AdoRzoU0pJ5xGifpKaeDdXgLANimtAf9PQecmGZU1Lf9VGy171Ce7lCMOM9bW_SZxHk&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=rqO4ULsM7pXresvY7j2L9A&_nc_ss=7b2a8&oh=00_Af6W-DrYnJrzRff9nfmMAgc08N6-eBsBu6Y72oxJR6PvVA&oe=6A1B60A6']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'https://www.facebook.com/groups/hotron8n/posts/1001659775555590/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'Ace muốn xây hệ thống với sản phẩm thảo dược, tiêu dùng thiết thực mỗi ngày? 
Mộc Việt sẵn sàng đồng hành cùng anh/chị phát triển kinh doanh bền vững – hỗ trợ từ A–Z, cầm tay chỉ việc.
 Sản phẩm chất lượng – thị trường rộng mở – cơ hội phát triển lâu dài.
 Liên hệ (Call/Zalo):
0966 262 281
0393 232 235 Ẩn bớt', 2, 2, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1498002101805769/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'mình cần người code web làm thiệp cưới online', 422, 33, 34, 107, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28107011152220700/', '2026-05-26T13:14:30'::TIMESTAMPTZ, 'Mình cần thiết kế web về mảng thực phẩm, hầu như làm mới từ đầu , khu vực hcm bạn nào hỗ trợ được để lại zalo mình sẽ tự liên hệ. Tks', 372, 43, 46, 79, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/979502304935905/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Thực sự thị trường IT nó tệ đến mức này rồi sao. E muốn tăng lương lên mức lương 8-9tr nhưng leader của e bảo với mức lương đó a thuê đc FE 2 năm có English rồi. Thì thế đúng ko ạ', 664, 161, 166, 57, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35666880026290710/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[VTI] đứng ở đâu, sự nghiệp BrSE cũng bứt phá - cơ hội đa dạng cho UV tại Việt Nam và Nhật Bản.
Dù đang ở đầu cầu Nhật Bản hay Việt Nam, VTI chào đón các Chuyên gia BrSE với:
Dành cho UV ở Nhật dự định về VN: Cơ hội "hạ cánh" an toàn với package thu nhập cạnh tranh, làm việc tại văn phòng Hà Nội/Đà Nẵng.
Dành cho UV đang onsite tại Nhật: Tiếp tục chinh phục thị trường Nhật Bản, chuyển đổi sang chuỗi siêu dự án mới với chế độ phúc lợi và hỗ trợ thủ tục tại Nhật.
Dành cho UV ở VN mong muốn đi Nhật: Cơ hội xách vali đi Onsite ngắn hạn/dài hạn ngay trong năm. VTI hỗ trợ 100% chi phí visa, vé máy bay và chỗ ở tiện nghi.
YÊU CẦU:
Tiếng Nhật N1 hoặc N2 cứng (giao tiếp tốt với khách hàng).
2+ năm kinh nghiệm Java
Có kinh nghiệm mảng Bảo hiểm hoặc năng lực Quản lý/Dẫn dắt team là điểm cộng lớn.
Anh/Chị ứng viên quan tâm có thể ib em tìm hiểu thêm job ạ.', 9, 3, 3, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.99422-6/708123783_2980098938993786_8959420617561882404_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=100&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TYvszaLlCGgQ7kNvwFyr-og&_nc_oc=AdoASZahLXDok0cWuDS0AvKnfF7qRhvVkADKbgAS69GF_kz1c3Xgqd-l-3cBkbLHhYA&_nc_zt=14&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=h7EAwg6rgMVLB8two58spw&_nc_ss=7b2a8&oh=00_Af79yYHWOLNail3-wXL0ws_GwHVRP-NR1ZjsbHiVFDhajw&oe=6A1C8EF5']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2770197040020739/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Open QC Manual Engineer (Junior) về với Rainscales làm testing dự án AI Computer Vision 
Hi mn, Rainscales đang cần chiêu mộ thêm 3 QC Manual từ 1-2 năm kinh nghiệm tương đương, tiếng Anh đọc viết tốt là được, có mong muốn học hỏi và phát triển kinh nghiệm với AI Testing. Ngoài ra team rất cần những bạn có khả năng chịu được nhiệt để xử lý task, tinh thần học hỏi cao, và có khả năng đảm nhận từ 2 dự án trở lên.
Mức lương deal theo năng lực, làm việc tại văn phòng Hòa Xuân ạ!!
Một vài chế độ đãi ngộ chỉ có tại Rainscales 
Cung cấp laptop làm việc và các thiết bị khác đi kèm;

Đóng BHXH full lương và đóng từ lúc thử việc, BHXH Sức khỏe Generali hưởng từ lúc pass probation;
Hưởng lương tháng 13 đầy đủ, tính luôn tháng bắt đầu thử việc;
Chế độ 12 ngày nghỉ phép/năm, thăm khám sức khỏe, thăm hỏi hiếu hỉ, sự kiện nội bộ, nghỉ Lễ Tết đầy đủ;
Quà Tết, Thưởng Tết từ Công Đoàn;
YEP, Company Trip, Team Building, Quốc tế Thiếu Nhi, Quốc tế Phụ Nữ, Ngày Quốc tế Đàn Ông đều có đầy đủ nha ace.
-------------------------
Chi tiết thêm về job ping Nhung tư vấn và gửi JD chi tiết nha ứng viên uii 
Welcome ae Tester đến với Rainscales ạ!!!
#QCManualEngineer #Tester #Hiring #Junior', 44, 19, 5, 5, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/707693677_1000447252526659_6179743928650393198_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=uFV3KFLdd6sQ7kNvwEtkDMZ&_nc_oc=AdoK3Z-Gk3el6zgoChf2vI_62RU_XDrI6gLK2JKzUZfVQaqVFMIy3-j6LiTs-xHG1DI&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=l-p53WknhYtsa31maeAMew&_nc_ss=7b2a8&oh=00_Af6_5-Gx0A3O12fgBtoHVPcKcNt9vMHoRmjcxO9e4-W0CQ&oe=6A1CB3CC']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', 'https://www.facebook.com/groups/533932866958136/posts/2906628706355195/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'FPT Software Đà Nẵng 

#Hybrid - #Remote trọn đời 
 Chuyển vùng 80M - 100M 
Các vị trí tuyển: #BrSE, #PM, #PreSales, #BA, #Dev, #Tester #Leader,... 
 JLPT N2/N1 
 Upto 4000$', 11, 1, 5, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển Dụng Nhân Sự CNTT', 'https://www.facebook.com/groups/1755029618054768/', 'https://www.facebook.com/groups/1755029618054768/posts/5386581814899512/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[FPT IS-HN] Tìm kiếm Network Engineer (L2/L3). Có KN làm việc với Check Point/Cisco
Thu nhập upto 35M gross
IB em gửi JD nhé', 11, 1, 5, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng lập trình - Việc làm CNTT Việt Nam', 'https://www.facebook.com/groups/javawebvietnam', 'https://www.facebook.com/groups/javawebvietnam/posts/3904615873180775/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[HN] SOCOTEC Việt Nam chiêu mộ Data Scientist với mức OFFER XỨNG TẦM up to 65 MIL VND 
 Cơ hội xịn đang chờ bạn – apply ngay thôi!
Bạn cần có:
4 năm KN trong lĩnh vực Data Scientist.
Phúc lợi hấp dẫn:
Thu nhập hấp dẫn + bonus hấp dẫn, review lương hằng năm.
BHXH đóng trên gross salary đầy đủ theo quy định.
42h/tuần + flexible working hours & 15 ngày WFH/năm.
13–15 ngày phép năm, tăng theo thâm niên & cấp bậc.
Team building, CLB thể thao cùng nhiều hoạt động nội bộ sôi nổi.
Môi trường quốc tế ổn định cùng lộ trình thăng tiến rõ ràng.
 Inbox ngay để nhận JD chi tiết !', 1, 1, 0, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/708878338_2477759586008164_1754795356236408575_n.jpg?stp=dst-jpg_p843x403_tt6&_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GuxkgA2Lf6wQ7kNvwHZDYIl&_nc_oc=AdrVj_-LEh4CTQ9ckt06ksQOK_JSgaRLakqf1Hb_NEjmBLQzp4UhF3VHMTm-7USwNXg&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=xZuJq7_FOzftrEpD65Gm-A&_nc_ss=7b2a8&oh=00_Af5RT5wFAyr-EFza7gqxF-Ve5l7_rq2zTU4JGVBxikRyqQ&oe=6A1C96AB']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1982370079082846/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[ĐN] Công ty em cần tuyển BRSE/PM (N1/N2), offer upto 5x gross, process nhanh
Ib zalo em 0903892106 nhận JD ạ.', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev/posts/4392088791078635/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'CEC HN TUYỂN IT HELPDESK (FULL-TIME)
Tụi mình đang tìm 1 bạn IT support “cứu cánh” cho hệ thống 
Mô tả nhanh:
• Quản lý, kiểm tra thiết bị (máy tính, máy in, mạng)
• Xử lý lỗi phần cứng & phần mềm cơ bản
• Hỗ trợ kỹ thuật tại các cơ sở
Yêu cầu:
• Tốt nghiệp/có nền tảng CNTT
• Biết sửa lỗi máy tính, mạng cơ bản
• Chủ động, chịu khó, giao tiếp ổn
Quyền lợi:
• Lương ~10–12tr + phụ cấp
• Môi trường ổn định, có đào tạo
• Ưu đãi học tiếng Anh nội bộ
 Ứng tuyển ngay nếu bạn muốn một công việc ổn định, rõ ràng, không “drama”', 38, 7, 11, 3, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'https://www.facebook.com/groups/3614844702129254/posts/4446248655655517/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'FPT Software Đà Nẵng 

Gói hỗ trợ chuyển vùng trí giá 80M - 100M 
Vị trí tuyển: 02 #TestLead 
 Không yêu cầu ngoại ngữ 
 Ưu tiên có kinh nghiệm làm thị trường Nhật', 8, 2, 3, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27131178293165032/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[ĐN] Công ty em cần tuyển BRSE/PM (N1/N2), offer upto 5x gross, process nhanh
Ib zalo em 0903892106 nhận JD ạ.', 4, 2, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'https://www.facebook.com/groups/myprofiles/posts/26958654683777769/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Không có nội dung', 12, 4, 4, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/983227767936308/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[HÀ NỘI] NETWORK ENGINEER – CMC TELECOM
 Công việc
 Giám sát & vận hành hệ thống mạng

 Theo dõi server, đường truyền, thiết bị mạng

 Xử lý sự cố và monitoring hệ thống

 Up to 15M + KPI + review lương 2 lần/năm


 Yêu cầu:
• Có CCNA hoặc tương đương
• Từ 1 năm kinh nghiệm
• Hiểu biết tốt về network protocols


 Thu nhập up to 15M + KPI + thưởng

 Môi trường công nghệ lớn, nhiều cơ hội học hỏi


 CV ứng tuyển gửi ngay qua inbox.', 5, 1, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/706089336_999688349481548_4051989649241548655_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=euMR6rglDogQ7kNvwG0cgcZ&_nc_oc=AdrmEnfcrbBCeHGU_7v2z4SJX_Q8tfG2hP5jCyEmk1TVeDtay7MqvKfkq3fdI3KoJaU&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=EUzG_qp6Nb1d3pcAVLqT4Q&_nc_ss=7b2a8&oh=00_Af72EHj9bpAfGq0ztjTljxbbukpVwKwDxvKJYGZemcx4Sg&oe=6A1CA73E']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2770197040020739/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Open QC Manual Engineer (Junior) về với Rainscales làm testing dự án AI Computer Vision 
Hi mn, Rainscales đang cần chiêu mộ thêm 3 QC Manual từ 1-2 năm kinh nghiệm tương đương, tiếng Anh đọc viết tốt là được, có mong muốn học hỏi và phát triển kinh nghiệm với AI Testing. Ngoài ra team rất cần những bạn có khả năng chịu được nhiệt để xử lý task, tinh thần học hỏi cao, và có khả năng đảm nhận từ 2 dự án trở lên.
Mức lương deal theo năng lực, làm việc tại văn phòng Hòa Xuân ạ!!
Một vài chế độ đãi ngộ chỉ có tại Rainscales 
Cung cấp laptop làm việc và các thiết bị khác đi kèm;

Đóng BHXH full lương và đóng từ lúc thử việc, BHXH Sức khỏe Generali hưởng từ lúc pass probation;
Hưởng lương tháng 13 đầy đủ, tính luôn tháng bắt đầu thử việc;
Chế độ 12 ngày nghỉ phép/năm, thăm khám sức khỏe, thăm hỏi hiếu hỉ, sự kiện nội bộ, nghỉ Lễ Tết đầy đủ;
Quà Tết, Thưởng Tết từ Công Đoàn;
YEP, Company Trip, Team Building, Quốc tế Thiếu Nhi, Quốc tế Phụ Nữ, Ngày Quốc tế Đàn Ông đều có đầy đủ nha ace.
-------------------------
Chi tiết thêm về job ping Nhung tư vấn và gửi JD chi tiết nha ứng viên uii 
Welcome ae Tester đến với Rainscales ạ!!!
#QCManualEngineer #Tester #Hiring #Junior', 66, 20, 11, 8, 'Không có video', ARRAY['https://scontent.fsgn2-5.fna.fbcdn.net/v/t39.30808-6/707693677_1000447252526659_6179743928650393198_n.jpg?stp=dst-jpg_s600x600_tt6&_nc_cat=104&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=uFV3KFLdd6sQ7kNvwEtkDMZ&_nc_oc=AdoK3Z-Gk3el6zgoChf2vI_62RU_XDrI6gLK2JKzUZfVQaqVFMIy3-j6LiTs-xHG1DI&_nc_zt=23&_nc_ht=scontent.fsgn2-5.fna&_nc_gid=VhfgwQ7wMjC-C0NAy3ZMUQ&_nc_ss=7b2a8&oh=00_Af5Ak7muZ-NfFgspiVvc5XDujCtg_IFdCms1c2iO9LPEyw&oe=6A1CB3CC']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', 'https://www.facebook.com/groups/1358071568620767/posts/1606215900472998/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Mình vừa test xong 1 tool mà thấy phải chia sẻ ngay.
Tên nó là: n8n-as-code
(repo GitHub: EtienneLescot/n8n-as-code)
---
Trước giờ build workflow n8n, mình làm theo kiểu:
→ Kéo thả trên UI
→ AI gợi ý JSON → mình tự copy vào
→ Lỗi node thì debug bằng tay
Vấn đề không phải là chậm.
Vấn đề là AI đang... đoán mò.
Nó không thực sự hiểu schema của từng node n8n.
Nên sinh ra workflow xong, sai parameter, sai option value.
Mình lại mất thêm 30 phút ngồi fix.
---
n8n-as-code giải quyết đúng cái này.
Thay vì AI đoán, tool này đưa cho agent:
→ 537 node chính thức với full schema
→ 10.209 properties + 17.155 option values
→ 7.702 workflow template của cộng đồng
→ 1.243 trang docs tích hợp sẵn
Hiểu nôm na: Agent giờ có bản đồ đầy đủ của n8n.
Không đoán nữa. Biết chính xác node nào có parameter gì.
---
Cái mình thích nhất là phần GitOps.
Workflow không còn nằm trong UI n8n như 1 cái hộp đen nữa.
Nó được kéo ra thành file TypeScript/JSON trên máy.
Có thể diff, review, merge như code bình thường.
Quy trình thực tế:
1. Agent search node + docs trước khi viết
2. Pull workflow về file local
3. Edit bằng JSON hoặc TypeScript
4. Validate theo schema thật → bắt lỗi trước khi push
5. Push file cụ thể lên n8n
---
Với VS Code hoặc Cursor, có extension riêng.
Cài xong là có ngay Agent Workbench tích hợp thẳng vào IDE.
Mình dùng cùng với Cursor — agent có thể nhìn thấy workflow đang mở,
môi trường n8n đang kết nối, và toàn bộ context của project.
Cảm giác như pair coding — nhưng partner là AI biết n8n hơn mình.
---
Cái tool này phù hợp với ai?
→ Đang build workflow n8n cho khách hàng với số lượng lớn
→ Muốn reuse template nhanh mà không sợ AI sinh sai schema
→ Cần version control workflow như một dự án code thật sự
---
Mình đang test thêm và sẽ làm video demo chi tiết.
Bạn nào tò mò, comment "n8n-as-code" bên dưới nhé 
#n8n #automation #AIagent #n8nasCode #GitOps #Cursor Ẩn bớt', 45, 10, 4, 9, 'Không có video', ARRAY['https://scontent.fsgn2-8.fna.fbcdn.net/v/t39.30808-6/703065015_122167858580972523_1906416096323346223_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=AmrnecCzMvUQ7kNvwEV_BT6&_nc_oc=Adp6VK2QeMfuEczpb8zGMHoizLHhYOGEdamfDkJ1XNILzTqrOLUyEh1m3V5qtYPZuUI&_nc_zt=23&_nc_ht=scontent.fsgn2-8.fna&_nc_gid=qgVi19oP9yCR9klqzH-KRw&_nc_ss=7b2a8&oh=00_Af5DHL-Tl_UA4x8yfu-1dWheAL85s2dB9Squbbc1jUpE8A&oe=6A1CBCC1']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35666880026290710/', '2026-05-27T12:25:15'::TIMESTAMPTZ, '[VTI] đứng ở đâu, sự nghiệp BrSE cũng bứt phá - cơ hội đa dạng cho UV tại Việt Nam và Nhật Bản.
Dù đang ở đầu cầu Nhật Bản hay Việt Nam, VTI chào đón các Chuyên gia BrSE với:
Dành cho UV ở Nhật dự định về VN: Cơ hội "hạ cánh" an toàn với package thu nhập cạnh tranh, làm việc tại văn phòng Hà Nội/Đà Nẵng.
Dành cho UV đang onsite tại Nhật: Tiếp tục chinh phục thị trường Nhật Bản, chuyển đổi sang chuỗi siêu dự án mới với chế độ phúc lợi và hỗ trợ thủ tục tại Nhật.
Dành cho UV ở VN mong muốn đi Nhật: Cơ hội xách vali đi Onsite ngắn hạn/dài hạn ngay trong năm. VTI hỗ trợ 100% chi phí visa, vé máy bay và chỗ ở tiện nghi.
YÊU CẦU:
Tiếng Nhật N1 hoặc N2 cứng (giao tiếp tốt với khách hàng).
2+ năm kinh nghiệm Java
Có kinh nghiệm mảng Bảo hiểm hoặc năng lực Quản lý/Dẫn dắt team là điểm cộng lớn.
Anh/Chị ứng viên quan tâm có thể ib em tìm hiểu thêm job ạ.', 10, 4, 3, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.99422-6/708123783_2980098938993786_8959420617561882404_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=100&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=TYvszaLlCGgQ7kNvwFyr-og&_nc_oc=AdoASZahLXDok0cWuDS0AvKnfF7qRhvVkADKbgAS69GF_kz1c3Xgqd-l-3cBkbLHhYA&_nc_zt=14&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=8u-yfA6xWvX_PAmscnS-Gg&_nc_ss=7b2a8&oh=00_Af6pl5Hyw5bAlzOORqm7ustq-yXqbdw8nFFfXoNq4p8ADw&oe=6A1CC735']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'https://www.facebook.com/groups/hotron8n/posts/1011925271195707/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Dạ anh/chị ơi cho em hỏi em lấy API và tạo sao lưu nó lại ghi lỗi vậy ạ
Em sắp nộp bài rồi mà làm cả tuần nay vẫn lỗi ạ
Em làm trong cụm AI Agent ạ', 29, 1, 14, 0, 'https://www.facebook.com/groups/hotron8n/posts/1011925271195707/', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t15.5256-10/707421232_1815889326239926_5876712524218217808_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=117846&_nc_ohc=9jV34JJ7YTYQ7kNvwESQsGg&_nc_oc=Adr2Clwpy1yIabICVrdiru6Vh9ZZ4kF6N64-9XjJyYuwRUxumL_El5G9aacgxTLvDUM&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=w3kDPro57fT_PGtziNYs9g&_nc_ss=7b2a8&oh=00_Af6X9oRwx58p9MXhhy9NN5YhlCPhw3iYZhaqYAq5ZA9szQ&oe=6A1C9892']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1498002101805769/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'mình cần người code web làm thiệp cưới online', 464, 37, 38, 117, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28097730289815453/', '2026-05-27T12:25:15'::TIMESTAMPTZ, 'Mình đang cần tìm một bạn / team thiết kế website cho lĩnh vực kiến trúc – xây dựng.
Nội dung chính:
Giới thiệu công ty & hồ sơ năng lực
Dịch vụ thiết kế kiến trúc, quy hoạch, nhà xưởng công nghiệp
Thi công trọn gói / tổng thầu
Portfolio dự án đẹp, hiện đại
Tối ưu hiển thị mobile và SEO cơ bản
Ưu tiên:
Có gu thẩm mỹ tối giản, hiện đại
Biết bố cục hình ảnh tốt
Đã từng làm web kiến trúc / nội thất / xây dựng là lợi thế
Bạn nào phù hợp inbox gửi:
Website đã làm
Báo giá tham khảo
Thời gian triển khai
Cảm ơn mọi người', 538, 53, 55, 125, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/980434674842668/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Mình nhờ đăng tin chút [HANOI] FRESHER FRONT-END DEVELOPER (ReactJS)
Cơ hội dành cho các bạn Fresher Front-end Developer muốn phát triển trong môi trường dự án quốc tế và làm việc cùng team công nghệ trẻ, năng động tại Nam Từ Liêm, Hà Nội.
 Requirements:
• Có tối thiểu khoảng 5 tháng kinh nghiệm thực tế với ReactJS
• Có khả năng giao tiếp tiếng Anh là một lợi thế lớn
Cơ hội:
• Được tham gia trực tiếp vào các dự án quốc tế
• Lộ trình onboarding và training rõ ràng
• Môi trường làm việc global, cởi mở và hỗ trợ phát triển lâu dài
• Cơ hội học hỏi và làm việc cùng các anh chị có kinh nghiệm trong team
 Quan tâm thì inbox trực tiếp cho mình để trao đổi thêm nha. Thank you', 42, 10, 13, 2, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35648235498155163/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '#TalentWanted
LG Đà Nẵng đang mở cửa cho những Software Engineer muốn “level up” sự nghiệp với các dự án automotive quy mô lớn 
 Môi trường trẻ, team support cực tốt
 Sếp giỏi, làm thật – học thật
 Dự án đủ lớn để bạn phát triển skill và tạo dấu ấn riêng
Nếu bạn muốn:
 Làm dự án lớn, tốc độ nhanh
 Học công nghệ mới liên tục
 Inbox mình để trao đổi thêm nhé hoặc gởi CV về: trinh.nguyen@lge.com
Phúc lợi:
- Mức lương và trợ cấp lương cạnh tranh
- Thử việc 100% lương
- BHXH 100% lương
- Giờ vào làm tuỳ chọn từ 7h-9h30
- Hybrid working (WFH từ 1-2 ngày/tuần)
- 18 ngày nghỉ hưởng FULL lương hàng năm.
-Cơ hội onsite
-Học tiếng Anh giao tiếp miễn phí all level
#danang #LG #automotive #software #IT', 10, 8, 1, 0, 'Không có video', ARRAY['https://scontent.fsgn2-10.fna.fbcdn.net/v/t39.30808-6/708043644_27876778958575376_4642103814361806600_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=PoLpLqc3_hEQ7kNvwGJlC8_&_nc_oc=AdpVvAhEW-TH6wIegJuB5emAj4whXDPWzyxrPj7r4glE-1NEOJMePRv00KLlPf0l8q8&_nc_zt=23&_nc_ht=scontent.fsgn2-10.fna&_nc_gid=OwNjP7Jyn6djdKM8yDDUQA&_nc_ss=7b2a8&oh=00_Af7IhvbLv1cL1ajTFEmznBPfjGVlrkDVOXbWW_nl8W5HBg&oe=6A1DF77C']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2770329520007491/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Hiện tại 2026 thì top 5 công ty IT ở Đà Nẵng gồm những cty nào mn nhỉ', 1358, 203, 204, 249, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển Dụng Nhân Sự CNTT', 'https://www.facebook.com/groups/1755029618054768/', 'https://www.facebook.com/groups/1755029618054768/posts/5387754814782212/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '[FPT IS-HN] TÌM KIẾM 02 Middle BA. Thu nhập upto 30M. Ưu tiên KN làm với Gov/HRM. Địa điểm: Keangnam
Inbox em gửi JD chi tiết ạ ^^', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev/posts/4393751437579037/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'HN/HCM/ĐN_Cần thêm 2 Middle BE, FE, React Native, BA ,Freelancer/full time remote hành chính, đóng BHXH, ko yc Tanh, ob nhanh. ib', 11, 9, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'https://www.facebook.com/groups/880353022746185/posts/2157258311722310/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '[Fsoft ĐN] Hạnh đang cần 1 bạn .NET Technical Lead, Eng giao tiếp tốt. Offer hấp dẫn + Signing bonus upto 35M. Hình thức làm việc Hybrid. Location Đà Nẵng', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng (IT Jobs)', 'https://www.facebook.com/groups/3614844702129254', 'https://www.facebook.com/groups/3614844702129254/posts/4448036828810033/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '(Hải Châu-Đà Nẵng)
SotaTek tuyển AI Engineer từ 3 yoe, có kinh nghiệm về LLMs, computer vision, ưu tiên tiếng Anh giao tiếp ( không bắt buộc). Pv 1 vòng, quan tâm ib ạ.', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc Làm CNTT-IT Đà Nẵng', 'https://www.facebook.com/groups/486674299325438', 'https://www.facebook.com/groups/486674299325438/posts/1694684055191117/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'SEADEV chào bạn 
Tụi mình đang tìm kiếm đồng đội cho 2 vị trí:
 C# Developer (4 years+) - up to 45 net
 
Customer Success Specialist (Good EN required) - up to 30 net
Với quỹ phúc lợi vô cùng "ổn app"
- 17 ngày phép năm, số ngày phép tăng theo thâm niên
- Nghỉ hè:  Tháng 7-9, làm 4.5 ngày/tuần (toàn công ty nghỉ chiều thứ 6).
- Các khoản bonus: Lương tháng thứ 13, work anniversary & referral bonus, quà sinh nhật cho nhân viên và con của nhân viên, quà kỷ niệm ngày cưới nhân viên….
- Đóng BHXH ngay từ thử việc
- Gói bảo hiểm sức khỏe PVI premium (gói bảo hiểm có hạn mức chi trả cao nhất của PVI) cho nhân viên và người thân ngay sau khi trở thành nhân viên chính thức.
- Company retreat 4 ngày 3 đêm, Family Day, Thanksgiving Party, Christmas Party...
- Free snack, trái cây, cà phê và bữa trưa thứ sáu hàng tuần
- Hoạt động thể thao vui nhộn với CLB bóng đá, cầu lông...
DM HR để tư vấn thêm job nhé Ẩn bớt', 1, 1, 0, 0, 'Không có video', ARRAY['https://scontent.fsgn2-8.fna.fbcdn.net/v/t39.30808-6/709736622_122180812190760913_1607127297954411385_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=9Nmue-xivq4Q7kNvwFpAfwt&_nc_oc=AdoJRYytIAqlBuRjqe41P_E1KOiO0I15BlxyGGAlM9yz3x_xjGph90qlFoT5OV8lZf0&_nc_zt=23&_nc_ht=scontent.fsgn2-8.fna&_nc_gid=At5grDcGWeTyh-ggR-RTGA&_nc_ss=7b289&oh=00_Af4AbD-2Cpk7GVHqAKqa_DzWqWG2QRD3-aYv77TefU46ag&oe=6A1E0112']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27148059841476877/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '[Onsite Đà Nẵng] Cần tuyển IT #Comtor từ 4 năm KN hoặc #BrSE từ 1-2 năm KN, tiếng Nhật N2. HĐ contractor, ib nhận JD ạ', 1, 1, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/984429734482778/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Có anh em .net nào relocate vào HCM, Đà Nẵng ko ạ. Em đang tuyển .net senior, Techlead cho product của châu Âu, chỉ từ 4yoe, TAnh giao tiếp tốt, range 50-90M, package 15 tháng lương, hybrid, ib em gửi JD ạ', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2771223679918075/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Em chào anh chị, không biết có công ty nào cần tuyển Intern Thương Mại Điện Tử không ạ, em kiếm quá trời không thấy huhu', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Cộng đồng AI Việt Nam', 'https://www.facebook.com/groups/1358071568620767/', 'https://www.facebook.com/groups/1358071568620767/posts/1611299283297993/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Em chào anh chị,
Hiện tại em đang triển khai một chiến dịch marketing tặng tài liệu trong cộng đồng Facebook mà em đã xây dựng trước đó.
Hiện em đang làm một quy trình tự động: khi user nhập form từ Ladipage, dữ liệu sẽ được đẩy về n8n để tự động gửi đúng loại tài liệu tương ứng. Tuy nhiên, em vẫn đang khá mơ hồ trong việc lựa chọn nền tảng gửi email sao cho hạn chế bị đánh dấu spam.
Hiện tại em đang dùng Gmail để gửi số lượng ít thì vẫn ổn, nhưng em lo khi cộng đồng tăng lên và phải gửi số lượng lớn, Gmail có thể đánh dấu spam do gửi lặp lại cùng một template nhiều lần.
Vì vậy, em muốn hỏi anh chị trong cộng đồng có gợi ý bên nào hỗ trợ API để dễ dàng tích hợp với n8n, phục vụ cho hệ thống email automation không ạ?
Em cảm ơn cả nhà rất nhiều! Ẩn bớt', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35699127596399286/', '2026-05-28T11:30:05'::TIMESTAMPTZ, '[Da Nang] Everfit is hiring
From workouts and nutrition to habit coaching, payments, and client communication, Everfit brings it all together with a powerful layer of automation to help coaches scale their impact and grow their business. We''re integrating next-gen AI sidekicks - smart assistants that help coaches program and unlock deep health insights in real time. Imagine if Jarvis from Iron Man doubled as your personal fitness strategist!
We''re AI-First at our core. Every feature we build, every decision we make - AI is at the center of it. If you want to work on a real product that uses AI to genuinely transform how people coach and train, this is the place. 
We''re looking for some more member to join our engineering team:
#Nodejs Engineer - if you love building scalable backend systems and have solid Microservices experience, this one''s for you.
#Technical_Lead for Payment Squad - if you''ve built or scaled payment/fintech systems and want to lead a high-impact team, we want to talk.

Come build a real product. Come build with AI. Come build something that matters. 

------------------------------
Everfit Vietnam

36 Tran Quoc Toan, Da Nang', 1, 1, 0, 0, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/710556256_1523405162531197_3365535391641693598_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=NlzU-CBAqdYQ7kNvwH7zmAR&_nc_oc=AdonDR7nyrOll71l6SoeFGPw1869mdmIABR5P18KsyIADa2iL0sZJA12KrP_3wN-zeU&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=QFssr6RvmmMspx7PGJ_Heg&_nc_ss=7b289&oh=00_Af4tgJTYZrtiEWELXe-52H0T-bcKANe8NzH7LQCe1hyujA&oe=6A1DE8D9']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'https://www.facebook.com/groups/hotron8n/posts/1013415944379973/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Em chào anh chị,
Hiện tại em đang triển khai một chiến dịch marketing tặng tài liệu trong cộng đồng Facebook mà em đã xây dựng trước đó.
Hiện em đang làm một quy trình tự động: khi user nhập form từ Ladipage, dữ liệu sẽ được đẩy về n8n để tự động gửi đúng loại tài liệu tương ứng. Tuy nhiên, em vẫn đang khá mơ hồ trong việc lựa chọn nền tảng gửi email sao cho hạn chế bị đánh dấu spam.
Hiện tại em đang dùng Gmail để gửi số lượng ít thì vẫn ổn, nhưng em lo khi cộng đồng tăng lên và phải gửi số lượng lớn, Gmail có thể đánh dấu spam do gửi lặp lại cùng một template nhiều lần.
Vì vậy, em muốn hỏi anh chị trong cộng đồng có gợi ý bên nào hỗ trợ API để dễ dàng tích hợp với n8n, phục vụ cho hệ thống email automation không ạ?
Em cảm ơn cả nhà rất nhiều! Ẩn bớt', 0, 0, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1499181041687875/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Mình đang cần làm web có tên miền. Web về Startup truyền thông.', 299, 65, 117, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28133646706223811/', '2026-05-28T11:30:05'::TIMESTAMPTZ, 'Có bạn nào nhận Seo map k ạ( vá vỏ lưu động)', 31, 8, 10, 1, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/980434674842668/', '2026-05-28T19:25:19'::TIMESTAMPTZ, 'Mình nhờ đăng tin chút [HANOI] FRESHER FRONT-END DEVELOPER (ReactJS)
Cơ hội dành cho các bạn Fresher Front-end Developer muốn phát triển trong môi trường dự án quốc tế và làm việc cùng team công nghệ trẻ, năng động tại Nam Từ Liêm, Hà Nội.
 Requirements:
• Có tối thiểu khoảng 5 tháng kinh nghiệm thực tế với ReactJS
• Có khả năng giao tiếp tiếng Anh là một lợi thế lớn
Cơ hội:
• Được tham gia trực tiếp vào các dự án quốc tế
• Lộ trình onboarding và training rõ ràng
• Môi trường làm việc global, cởi mở và hỗ trợ phát triển lâu dài
• Cơ hội học hỏi và làm việc cùng các anh chị có kinh nghiệm trong team
 Quan tâm thì inbox trực tiếp cho mình để trao đổi thêm nha. Thank you', 59, 18, 16, 3, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/980482484837887/', '2026-05-29T10:24:31'::TIMESTAMPTZ, 'Em 2002 tháng 9 tới sẽ có bằng tốt nghiệp( vì một vài lý do giá đình nên Tốt nghiệp muộn), có gpa đạt loại giỏi. Có báo khoa học quốc tế, học trường tốp (uet) không biết giờ xin fresher AI Engineer có lợi hơn các em 2k4 2k5 ko :(((', 281, 73, 77, 18, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/979502304935905/', '2026-05-29T12:51:28'::TIMESTAMPTZ, 'Thực sự thị trường IT nó tệ đến mức này rồi sao. E muốn tăng lương lên mức lương 8-9tr nhưng leader của e bảo với mức lương đó a thuê đc FE 2 năm có English rồi. Thì thế đúng ko ạ', 932, 224, 231, 82, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2771076703266106/', '2026-05-29T12:51:28'::TIMESTAMPTZ, 'làm sao để liên hệ và apply vào paradox - workday tại ĐN ạ. Với lại ở đây có tốt khom ạ', 223, 49, 51, 24, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/980482484837887/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'Em 2002 tháng 9 tới sẽ có bằng tốt nghiệp( vì một vài lý do giá đình nên Tốt nghiệp muộn), có gpa đạt loại giỏi. Có báo khoa học quốc tế, học trường tốp (uet) không biết giờ xin fresher AI Engineer có lợi hơn các em 2k4 2k5 ko :(((', 281, 73, 77, 18, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35703268415985204/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'Sẵn Sàng Cho Bước Đi Sự Nghiệp Tiếp Theo Của Bạn? Tham gia Astraler!', 23, 9, 4, 2, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.99422-6/709122908_4286021341658141_8393948730031471889_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=101&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=2Cua4aidsPIQ7kNvwFhi0PN&_nc_oc=AdqrhCvDRfTqTy727A8L6YgcVPNsMcR8xpNNZ-kFwpS7MAwBc7UQbDrl0g4pl-PezhhkxDMc-icDY6rGzTqZXnRf&_nc_zt=14&_nc_ht=scontent.fdad3-6.fna&_nc_gid=ZFTPAVoIVlHwcC_G9-S7GQ&_nc_ss=7b2a8&oh=00_Af65qvW9zXDKWu-jZN_zjZvqyAKZfulknstDUFr_E1q1ig&oe=6A1ECAA8']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2771076703266106/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'làm sao để liên hệ và apply vào paradox - workday tại ĐN ạ. Với lại ở đây có tốt khom ạ', 223, 49, 51, 24, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', 'https://www.facebook.com/groups/533932866958136/posts/2908335486184517/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'Team Seadev Đà Nẵng đang open:
 C# Developer (4 years+) - up to 45M net
 Customer Success Specialist - up to 30M net
Với quỹ phúc lợi vô cùng "ổn app"
- 17 ngày phép năm, số ngày phép tăng theo thâm niên
- Nghỉ hè:  Tháng 7-9, làm 4.5 ngày/tuần (toàn công ty nghỉ chiều thứ 6).
- Các khoản bonus: Lương tháng thứ 13, work anniversary & referral bonus, quà sinh nhật cho nhân viên và con của nhân viên, quà kỷ niệm ngày cưới nhân viên….
- Đóng BHXH ngay từ thử việc
- Gói bảo hiểm sức khỏe PVI premium (gói bảo hiểm có hạn mức chi trả cao nhất của PVI) cho nhân viên và người thân ngay sau khi trở thành nhân viên chính thức.
- Company retreat 4 ngày 3 đêm, Family Day, Thanksgiving Party, Christmas Party...
- Free snack, trái cây, cà phê và bữa trưa thứ sáu hàng tuần
- Hoạt động thể thao vui nhộn với CLB bóng đá, cầu lông...
Ping me ping me Ẩn bớt', 14, 3, 1, 3, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/709054253_122180813186760913_5383293545063301114_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=BAIDZ9So73EQ7kNvwEsAFfe&_nc_oc=AdqMZhNJaWETnIinzOuwMDR_0tot33FFEnFIOG6gOA8pynXzxp_bsRjekFVTLbEq_KOquW-gwZJ6J4uVa8uVxd7Y&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=PBPEPQRXOAziP1oPsPywUw&_nc_ss=7b2a8&oh=00_Af6Kl-fmiiR2lG-DsXinmmzR6h0FmixlexcrlwUF3txopA&oe=6A1EDB4C']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển Dụng Nhân Sự CNTT', 'https://www.facebook.com/groups/1755029618054768/', 'https://www.facebook.com/fallback_mock_post_136', '2026-05-29T13:05:19'::TIMESTAMPTZ, '[FPT IS-HN] TÌM KIẾM 02 Middle BA. Thu nhập upto 30M. Ưu tiên KN làm với Gov/HRM. Địa điểm: Keangnam
Inbox em gửi JD chi tiết ạ ^^', 3, 1, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1983572528962601/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'Sẵn Sàng Cho Bước Đi Sự Nghiệp Tiếp Theo Của Bạn? Tham gia Astraler!', 9, 1, 4, 0, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.99422-6/709635851_1198504503339542_4713795660361350747_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=108&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=kGmIyekMsN8Q7kNvwFt6otQ&_nc_oc=AdrEwO5DPD17R2gqIUGayRtMSyRF6xnF8-Qnc-xXludsDLwsmLUlkIzszdzuh7gmqWREnBLspjr8ody9yBZuT94E&_nc_zt=14&_nc_ht=scontent.fdad3-6.fna&_nc_gid=NxHPg4IuP6zLQabOLSb8xQ&_nc_ss=7b2a8&oh=00_Af6sKSzuL296p6yW-BO3bXO5vxAnBArsXml9ZrxEfT8OBQ&oe=6A1EE792']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev/posts/4393751437579037/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'HN/HCM/ĐN_Cần thêm 2 Middle BE, FE, React Native, BA ,Freelancer/full time remote hành chính, đóng BHXH, ko yc Tanh, ob nhanh. ib', 12, 10, 1, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'https://www.facebook.com/groups/880353022746185/posts/2158095904971884/', '2026-05-29T13:05:19'::TIMESTAMPTZ, 'ĐỔ BỘ LIST JOB DATA ENGINEER
Chu choa cái lít chóp Data hắng ê hề như ri mà khung có người apply hấy. Mình buồng dử luông. Ai quan tâm chóp mô inbox em gửi JD hấy. Có chóp làm remote luông nghe.
Contact zalo em nì:
0963.061.061', 3, 1, 1, 0, 'Không có video', ARRAY['https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/710745517_4357301064598197_3104269550662090195_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=b1foTTXc-KAQ7kNvwH-F2np&_nc_oc=AdqRXwKYP-LJNtvvF89ecVbU2OobjjJZ6qv-oT1ROxw1yy7mLDnRPWqrWqr6M5Yi5iQ3040wZRnRaYX_b7rMSV_L&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=xH4zMkOYjcnqo8H34I-rOw&_nc_ss=7b2a8&oh=00_Af4Aa6tmHBeEjcZuXYMejhSZAj3gWwO6tw5MddfGTppdpQ&oe=6A1EEE22']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT 3', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/979502304935905/', '2026-05-29T13:25:43'::TIMESTAMPTZ, 'Thực sự thị trường IT nó tệ đến mức này rồi sao. E muốn tăng lương lên mức lương 8-9tr nhưng leader của e bảo với mức lương đó a thuê đc FE 2 năm có English rồi. Thì thế đúng ko ạ', 935, 224, 231, 83, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2771076703266106/', '2026-05-29T13:25:43'::TIMESTAMPTZ, 'làm sao để liên hệ và apply vào paradox - workday tại ĐN ạ. Với lại ở đây có tốt khom ạ', 223, 49, 51, 24, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/327940020092140?locale=vi_VN', 'https://www.facebook.com/groups/327940020092140/posts/981289988090470/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Thực tập ko lương
Mn người nghĩ sao về việc thực tập không lương chỉ lấy kinh nghiệm. Sau đó còn phải đóng cho Cty 3tr tiền sử dụng thiết bị ạ??
Mong ad duyệt.', 825, 171, 180, 98, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng - New', 'https://www.facebook.com/groups/vieclamcnttdanangnew', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35703268415985204/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Sẵn Sàng Cho Bước Đi Sự Nghiệp Tiếp Theo Của Bạn? Tham gia Astraler!', 23, 9, 4, 2, 'Không có video', ARRAY['https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.99422-6/709122908_4286021341658141_8393948730031471889_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=101&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=2Cua4aidsPIQ7kNvwE9Ajrd&_nc_oc=AdoQ-1OGD3rj6JgmkYWq_nxpKLcJuFOK0ooAIxUA_lFbTup9KlEzE58YzBd8G8DDIHk&_nc_zt=14&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=t_ZTLmUk6PuelRtf6YLrzg&_nc_ss=7b2a8&oh=00_Af65OQ0lwIvSe6xyDTaXGvNx70KwNMYKn5_5ISJnh0sxHA&oe=6A1F3B28']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn/', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2771076703266106/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'làm sao để liên hệ và apply vào paradox - workday tại ĐN ạ. Với lại ở đây có tốt khom ạ', 253, 52, 54, 31, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/533932866958136/', 'https://www.facebook.com/groups/533932866958136/posts/2908335486184517/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Team Seadev Đà Nẵng đang open:
 C# Developer (4 years+) - up to 45M net
 Customer Success Specialist - up to 30M net
Với quỹ phúc lợi vô cùng "ổn app"
- 17 ngày phép năm, số ngày phép tăng theo thâm niên
- Nghỉ hè:  Tháng 7-9, làm 4.5 ngày/tuần (toàn công ty nghỉ chiều thứ 6).
- Các khoản bonus: Lương tháng thứ 13, work anniversary & referral bonus, quà sinh nhật cho nhân viên và con của nhân viên, quà kỷ niệm ngày cưới nhân viên….
- Đóng BHXH ngay từ thử việc
- Gói bảo hiểm sức khỏe PVI premium (gói bảo hiểm có hạn mức chi trả cao nhất của PVI) cho nhân viên và người thân ngay sau khi trở thành nhân viên chính thức.
- Company retreat 4 ngày 3 đêm, Family Day, Thanksgiving Party, Christmas Party...
- Free snack, trái cây, cà phê và bữa trưa thứ sáu hàng tuần
- Hoạt động thể thao vui nhộn với CLB bóng đá, cầu lông...
Ping me ping me Ẩn bớt', 14, 3, 1, 3, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/709054253_122180813186760913_5383293545063301114_n.jpg?stp=dst-jpg_s640x640_tt6&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=BAIDZ9So73EQ7kNvwGqcG0V&_nc_oc=AdosAYHmP1QAQGwqGxbwzqQfZxovnYwDUjtM7h3Dr7mlGsTqEJnc3rokB8O2Gy2tuLI&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=_M9suViCKiZ2a6HDIgW31Q&_nc_ss=7b2a8&oh=00_Af4infQgMTz00Q0-MeHcOmc8PCvUkKQtf6BaQw1gY5gjPQ&oe=6A1F4BCC']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thực tập CNTT Đà Nẵng - Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/1261520704501124', 'https://www.facebook.com/groups/1261520704501124/posts/1983572528962601/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Sẵn Sàng Cho Bước Đi Sự Nghiệp Tiếp Theo Của Bạn? Tham gia Astraler!', 10, 2, 4, 0, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.99422-6/709635851_1198504503339542_4713795660361350747_n.png?stp=dst-jpg_p526x296_tt6&_nc_cat=108&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=kGmIyekMsN8Q7kNvwGLmqDC&_nc_oc=AdoEzxXEXZmJKVvuFXKFDLjKnVXcBVPFOCqXhhzrREPXXKcT7lUWyADBkwbZdUHK2B0&_nc_zt=14&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=cXx_P-ccAn7gjvo0KYW9BA&_nc_ss=7b2a8&oh=00_Af5bITZPVhSaRjlsJRJct4xJYWD_C2NMerGq7F3OQLfmOg&oe=6A1F5812']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - AI engineer', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev', 'https://www.facebook.com/groups/ithotjobs.tuyendungit.vieclamcntt.susudev/posts/4394090800878434/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'TUYỂN DỤNG AI ENGINEER

 Thanh Xuân, Hà Nội

 Lương: 30 triệu/tháng (thỏa thuận thêm khi phỏng vấn)
Chúng mình đang tìm kiếm AI Engineer tham gia phát triển và vận hành các hệ thống AI/Automation phục vụ hoạt động kinh doanh.
 YÊU CẦU
• Có kiến thức/kỹ năng về AI, Automation, API hoặc xử lý dữ liệu
• Tư duy logic tốt, chủ động trong công việc
• Có kinh nghiệm sử dụng Lark/Lark Suite để quản lý workflow, vận hành công việc hoặc phối hợp liên phòng ban là một lợi thế
 Môi trường trẻ, nhiều cơ hội phát triển và làm việc với các dự án AI thực tế.
 Inbox m gửi JD', 12, 4, 4, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng CNTT Đà Nẵng', 'https://www.facebook.com/groups/880353022746185', 'https://www.facebook.com/groups/880353022746185/posts/2158192214962253/', '2026-05-29T13:17:56'::TIMESTAMPTZ, '[Ngũ Hành Sơn - Đà Nẵng] Orient Software mở tuyển 01 AI Engineer Intern
 Ưu tiên:
Sinh viên năm 3/năm 4 chuyên ngành Computer Science, Information Technology, Artificial Intelligence,...
Có thể làm việc Full-time, Tiếng Anh tốt
 Đãi ngộ:
Thực tập 3 tháng có trợ cấp, với 1 ngày nghỉ có lương/tháng
Có cơ hội trở thành nhân viên chính thức sau kì thực tập
Free đồ ăn sáng và happy hour mỗi thứ 5
Được mentor bởi Senior trong dự án
 CV gửi về: nhi.tran@orientsoftware.com', 14, 5, 3, 1, 'Không có video', ARRAY['https://scontent.fsgn2-10.fna.fbcdn.net/v/t39.30808-6/709670116_2972903196237253_2976923975133025661_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=109&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=BPsnvBvtHbEQ7kNvwFZW1Gk&_nc_oc=Ado-ISzB7dhFsDzWz3G20_Bx-iqlkHsR9asqez1H9Q1CawN6mRMBtnZ1e6IM9E-7Rks&_nc_zt=23&_nc_ht=scontent.fsgn2-10.fna&_nc_gid=ModIBShW245fzg-QQQz85A&_nc_ss=7b2a8&oh=00_Af7FlZfYPjfwjsNESPlRFIIpzFHFheeXFWYYl6-NH1atow&oe=6A1F60E1']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT, IT Đà Nẵng', 'https://www.facebook.com/groups/itdanang', 'https://www.facebook.com/groups/itdanang/posts/27158811680401693/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'FRESHERS/JUNIORS ƠI, AVEPOINT ĐANG MỞ RỘNG TUYỂN DỤNG TOÀN QUỐC 

Cơ hội gia nhập môi trường công nghệ quốc tế dành cho các bạn sinh viên năm cuối, fresher và junior đã chính thức mở đơn!


 Công việc IT/Business ổn định, đãi ngộ tốt

 Môi trường sử dụng tiếng Anh & làm việc quốc tế

 Được training bài bản và có lộ trình phát triển rõ ràng

 Work-life balance với lịch làm việc Thứ 2 – Thứ 6


 WORK LOCATION

 Hà Nội – Artemis Building, 3 Lê Trọng Tấn

 Đà Nẵng – Vĩnh Trung Plaza

 TP.HCM – CirCo Building, Điện Biên Phủ


 Tech Positions
• .NET C# Developer
• QA/Manual Tester
• ACS Infra Engineer (DevOps)
• IT Engineer (Helpdesk)

• Security Engineer
• IT Security
• Salesforce Developer
• Software Engineer


 Business & Operation Positions
• Product Manager
• Business Analyst
• Service Engineer
• Revenue Accountant
• Expense Specialist
• Payment Collection
• Product Coordinator
• Partner Program Specialist
• Associate Commission Specialist


 WHY AVEPOINT?

 Nhận 100% lương trong thời gian thử việc

 BHXH full lương ngay từ ngày đầu tiên

 Review lương 2 lần/năm

 Thưởng quý + thưởng năm hấp dẫn

 Môi trường trẻ, năng động, đồng nghiệp siêu supportive

 Nhiều cơ hội học hỏi, phát triển và onsite quốc tế


 Working Time: Monday – Friday | 9:00 AM – 6:00 PM


 APPLY NOW

 [Amelia.nguyen@avepoint.com](mailto:Amelia.nguyen@avepoint.com)

 Zalo/Hotline: 0879421207


 Email title: [Position] – Full Name', 19, 3, 2, 4, 'Không có video', ARRAY['https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/710098561_1506310377948202_8171361831444752392_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=F9lqqLRFQ7cQ7kNvwGbcLsz&_nc_oc=Adrd5KcpDQhjKYrAcleFrmvh42XPxkZf8qeSTniX--lp36J4vWPh39G0CCS3p6vSz0M&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=zLMs9DWExch5V4aMZgv0Fw&_nc_ss=7b2a8&oh=00_Af7739GlTAzxfSZseW7mgw12wJXlO-NhuHYLTQ9NQ9z2dw&oe=6A1F6138', 'https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.30808-6/707750148_1506310347948205_2986920184139006545_n.jpg?stp=dst-jpg_s590x590_tt6&_nc_cat=101&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=lwFZ61xixdoQ7kNvwHQQsTo&_nc_oc=AdrAhHuDvSr-FzrYL2Yr0hUt5sMHRDMV8Ib6CoOAhXJLiiAvYLfbuEowpUd2YXLeuw0&_nc_zt=23&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=zLMs9DWExch5V4aMZgv0Fw&_nc_ss=7b2a8&oh=00_Af6zBX-nNvxyr8NpBqeRHmOWX8CXukaTRs7XWJnmFzZvXQ&oe=6A1F476B']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'My Profile: Việc làm CNTT (Dev, Tester, IT, HelpDesk, HR, Marketing,)', 'https://www.facebook.com/groups/myprofiles', 'https://www.facebook.com/groups/myprofiles/posts/27016808264629077/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'MEITEC tuyển dụng nhiều vị trí IT cho dự án thị trường Nhật Bản
 Vị trí tuyển:
 Data Engineer / AI Engineer
 Manual Tester / Automation Tester
 Business Analyst
 Database Admin (DBA)
 Quyền lợi hấp dẫn:
 Offer upto 60M/tháng
 Signing Bonus 01 tháng lương
 Thu nhập upto 15 tháng lương/năm
 Dự án quy mô lớn, công nghệ hiện đại
 Không yêu cầu tiếng Anh/Nhật
 Môi trường chuyên nghiệp, ổn định lâu dài
 Yêu cầu:
 Tối thiểu 01 năm kinh nghiệm ở vị trí ứng tuyển
 Cơ hội phù hợp cho anh em muốn tham gia dự án quốc tế nhưng chưa tự tin ngoại ngữ.
 Inbox hoặc gửi CV để nhận JD chi tiết. Ẩn bớt', 7, 1, 3, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/707098084_2524571914629076_2953457152915498733_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=ztHXyecWYlQQ7kNvwGiun1Y&_nc_oc=Adondn6wTpdsNM2r9bzFjvnAv_Dt42ynIOWh9srmFYy-Ovp9gDZHdb6u7BcdEFy8Syc&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=__Q5iWCCPaUISrm6cD6O9w&_nc_ss=7b2a8&oh=00_Af7Z5t6jW9bNM1s332fXyoRtrkAinPgbTgQBysZsDKB5gQ&oe=6A1F55F9']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'IT Jobs - Tuyển Dụng IT - Việc làm CNTT - SusuDev', 'https://www.facebook.com/groups/413895374869553', 'https://www.facebook.com/groups/413895374869553/posts/984565987802486/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'HCM – Quận 1 | Tuyển IT cho dự án Insurance dài hạn
Team mình đang cần thêm vài anh/chị có kinh nghiệm để join dự án bảo hiểm ổn định Range 20-33M (tùy vị trí) 
 Open roles:
• Java Developer – 4+ YoE
• .NET Developer – 4+ YoE
• ReactJS Developer – 3+ YoE
• Data Engineer – 3+ YoE
• IT Business Analyst – 3+ YoE
• Manual Tester – 2+ YoE
 Môi trường phù hợp cho anh/chị muốn:
 Làm dự án dài hạn, ổn định
 Team support tốt, phối hợp thoải mái
 Phát triển thêm technical & business skills
 Làm việc tại văn phòng trung tâm Quận 1
 Onsite HCM – Q1
 Inbox mình để nhận JD chi tiết nha
 thypnm1@tinhvan.com
 Zalo/Phone: 0903874592', 6, 2, 2, 0, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-6/708927949_122114162798981076_4328154152480012868_n.jpg?stp=dst-jpg_s720x720_tt6&_nc_cat=103&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=YeOyAeQiGFUQ7kNvwFiI88G&_nc_oc=Adrj6zd8hzRw7k4p-fZgq9t9py3KDCHLTr4h8mcPObfxJ9fydb4y-y-Fk13ezmZ7w_M&_nc_zt=23&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=dwbykkAG-LUPTvnwYg4I_Q&_nc_ss=7b2a8&oh=00_Af4vmBBPr1wqfY74TOuT6L7p_WkmlZZizSLjg4wvg-zXfQ&oe=6A1F4FFC']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Việc làm CNTT Đà Nẵng', 'https://www.facebook.com/groups/vieclamcnttdn', 'https://www.facebook.com/groups/vieclamcnttdn/posts/2772177229822720/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'HELLO ĐÀ NẴNG! SystemEXE đã trở lại và lợi hại hơn xưa!
SystemEXE sẽ có mặt tại Job Fair ĐH Duy Tân với nhiều cơ hội IT tại Đà Nẵng!
Job Fair – ĐH Duy Tân (đường Hoàng Minh Thảo)
Sáng 04/06/2026 (Thứ Năm)
Job Openings:
Cloud Engineer
IT System Admin
Java/.NET Developer
Fullstack Developer
Project Leader
IT Comtor
BrSE
Ghé booth SystemEXE tại Job Fair để được tư vấn, phỏng vấn trực tiếp và biết đâu… rinh offer về ngay!
Yêu cầu chung:
Tốt nghiệp Đại học chuyên ngành liên quan
Có kinh nghiệm phù hợp với vị trí ứng tuyển
Gửi CV: tuyendung@system-exe.com.vn
Tiêu đề: [CV Job Fair] – Họ tên – Vị trí để book trước slot nhé!
VP Đà Nẵng: 773 Ngô Quyền, P. An Hải, TP. Đà Nẵng', 69, 21, 6, 12, 'Không có video', ARRAY['https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.99422-6/708630899_1292771219591827_6331856435960962164_n.png?stp=dst-jpg_s600x600_tt6&_nc_cat=106&cb2=07a86f17-38790ae2&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=WGISoUoxeaIQ7kNvwEMa-ef&_nc_oc=AdrwsScjZndaOvP7MGxZx8TmvszIMhEVisSkd0B7FzpKFkiRHmkoH52x-ItPoqzCd4Y&_nc_zt=14&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=Xa-R5uyd6J_jX83soMHg1g&_nc_ss=7b2a8&oh=00_Af71pxxfStiszMZYXZD2oNxEM_Gab9HXCWK9AhirfJtzoQ&oe=6A1F6D78']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Tuyển dụng Thực tập sinh IT', 'https://www.facebook.com/groups/777110019027822', 'https://www.facebook.com/groups/vieclamcnttdanangnew/posts/35722691467376232/', '2026-05-29T13:17:56'::TIMESTAMPTZ, '[Ngũ Hành Sơn - Đà Nẵng] Orient Software mở tuyển 01 AI Engineer Intern
Ưu tiên:
Sinh viên năm 3/năm 4 chuyên ngành Computer Science, Information Technology, Artificial Intelligence,...
Có thể làm việc Full-time, Tiếng Anh tốt
 Đãi ngộ:
Thực tập 3 tháng có trợ cấp, với 1 ngày nghỉ có lương/tháng
Có cơ hội trở thành nhân viên chính thức sau kì thực tập
Free đồ ăn sáng và happy hour mỗi thứ 5
Được mentor bởi Senior trong dự án
 CV gửi về: nhi.tran@orientsoftware.com', 67, 25, 6, 10, 'Không có video', ARRAY['https://scontent.fsgn2-3.fna.fbcdn.net/v/t39.30808-6/709960806_2972895249571381_7476369330109894824_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=107&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=gqCG5hfFJ5UQ7kNvwHcMV4e&_nc_oc=Adrze-F9XDM8DmJIvxd4e0smdG6Vf59E-SNWJd2OmDrR0-dhpmWmbnq3r8ac01A62sM&_nc_zt=23&_nc_ht=scontent.fsgn2-3.fna&_nc_gid=5WspOwtC-vxM7Js-2kMCFA&_nc_ss=7b2a8&oh=00_Af7DsGGqRz4ycnuOVuyQEPQ5s1FZHNbLO-CyHRPjX7jiVw&oe=6A1F6D17']::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'n8n mới', 'https://www.facebook.com/groups/hotron8n', 'https://www.facebook.com/groups/hotron8n/posts/1001659775555590/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Ace muốn xây hệ thống với sản phẩm thảo dược, tiêu dùng thiết thực mỗi ngày? 
Mộc Việt sẵn sàng đồng hành cùng anh/chị phát triển kinh doanh bền vững – hỗ trợ từ A–Z, cầm tay chỉ việc.
 Sản phẩm chất lượng – thị trường rộng mở – cơ hội phát triển lâu dài.
 Liên hệ (Call/Zalo):
0966 262 281
0393 232 235 Ẩn bớt', 3, 3, 0, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Thiết Kế Web Giá Rẻ - Code MMO Theo Yêu Cầu', 'https://www.facebook.com/groups/thietkewebvietnam/?ref=share&mibextid=wwXIfr&rdid=ABQkcOiAWmzjct57&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1BVqvuPbet%2F%3Fmibextid%3DwwXIfr#', 'https://www.facebook.com/groups/thietkewebvietnam/posts/1498002101805769/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'mình cần người code web làm thiệp cưới online', 515, 40, 41, 131, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();
INSERT INTO public.facebook_posts (id, group_name, group_url, post_url, crawl_date, content, score, reactions, comments, shares, media_url, image_urls, created_at, updated_at)
VALUES (uuid_generate_v4(), 'Hội thiết kế website và SEO web Online', 'https://www.facebook.com/groups/1998083910206781/?ref=share&mibextid=wwXIfr&rdid=LWj0Oy0zVU4fQC4N&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1Dg8gcf5hk%2F%3Fmibextid%3DwwXIfr', 'https://www.facebook.com/groups/1998083910206781/posts/28132943856294096/', '2026-05-29T13:17:56'::TIMESTAMPTZ, 'Cần tìm thiết kế web chuẩn Seo mảng nhà máy sản xuất Trái cây sấy .', 400, 64, 168, 0, 'Không có video', ARRAY[]::TEXT[], NOW(), NOW())
ON CONFLICT (post_url) DO UPDATE SET
  reactions = EXCLUDED.reactions, comments = EXCLUDED.comments, shares = EXCLUDED.shares, score = EXCLUDED.score, updated_at = NOW();

-- 9. CHÈN DỮ LIỆU BẢNG: public.facebook_interactions
INSERT INTO public.facebook_interactions (id, post_url, email_interactor, name, like_count, comment_text, comment_date, created_at, updated_at)
VALUES (uuid_generate_v4(), 'https://www.facebook.com/groups/1287572879512264/posts/1497846315151585/', 'thao@facebook.com', 'thao', 0, 'hay', '2026-05-16T10:22:59'::TIMESTAMPTZ, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==============================================================
-- FIX v7: Cap nhat shares=0 cho cac linkedin_posts con NULL
-- ==============================================================
UPDATE public.linkedin_posts SET shares = 0 WHERE shares IS NULL;
-- 10. CHÈN DỮ LIỆU BẢNG: public.crawl_history
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'nguyen@facebook.com', 'nguyen', 2, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'hung@facebook.com', 'hung', 3, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'thanh@facebook.com', 'thanh', 5, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'thao@facebook.com', 'thao', 6, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'nguyen@facebook.com', 'nguyen', 0, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'hung@facebook.com', 'hung', 0, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'thanh@facebook.com', 'thanh', 0, '2026-05-24'::DATE, NOW());
INSERT INTO public.crawl_history (id, email_crawl, group_name, score_per_week, date_per_week, created_at)
VALUES (uuid_generate_v4(), 'thao@facebook.com', 'thao', 0, '2026-05-24'::DATE, NOW());

-- ==============================================================
-- 11. ĐỒNG BỘ/KẾ THỪA TỰ ĐỘNG CÁC PHÂN LOẠI (INTENT, INDUSTRY, TIER, TEAM) TỪ GROUP SANG POST
-- ==============================================================
UPDATE public.facebook_posts p
SET 
    intent = g.intent,
    industry = g.industry,
    tier = g.tier,
    team = g.team
FROM public.facebook_groups g
WHERE p.group_url = g.group_url;

UPDATE public.linkedin_posts p
SET 
    intent = g.intent,
    industry = g.industry,
    tier = g.tier,
    team = g.team,
    icp = g.icp,
    icp_desc = g.icp_desc
FROM public.linkedin_groups g
WHERE p.group_url = g.group_url;
