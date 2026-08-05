"""Small helper for local import check."""
import importlib

mod = importlib.import_module(
    "linkedin_group_crawler.app.modules.facebook.src.modules.facebook.services.facebook_scraper"
)

print("module:", mod.__name__)
print("has _pick_by_keywords_and_threshold:", hasattr(mod, "_pick_by_keywords_and_threshold"))

