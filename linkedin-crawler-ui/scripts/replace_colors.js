const fs = require('fs');
const files = [
  'c:/Code/scraper-linkedin/linkedin-crawler-ui/components/all-platform/admin/dashboard/AdminBentoWidgets.tsx',
  'c:/Code/scraper-linkedin/linkedin-crawler-ui/components/all-platform/admin/dashboard/AdminDashboardSummary.tsx',
  'c:/Code/scraper-linkedin/linkedin-crawler-ui/components/all-platform/admin/dashboard/AdminKpiHistoryTable.tsx',
  'c:/Code/scraper-linkedin/linkedin-crawler-ui/components/all-platform/admin/dashboard/AdminKpiPerformanceChart.tsx'
];
for(const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/#991B1B/g, '#DC2626');
  content = content.replace(/#800000/g, '#B91C1C');
  content = content.replace(/#7A1515/g, '#B91C1C');
  fs.writeFileSync(f, content);
  console.log('Updated', f);
}
