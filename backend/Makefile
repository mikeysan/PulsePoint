.PHONY: validate-feeds check-feeds feeds

validate-feeds:
	python scripts/validate_feeds.py

check-feeds:
	python scripts/check_feeds.py

feeds:
	python scripts/validate_feeds.py && python scripts/check_feeds.py

discover-feed:
	python scripts/discover_feeds.py $(URL)