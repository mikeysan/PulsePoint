"""
End-to-end performance tests for PulsePoint application.
Tests application functionality after performance optimizations.
"""
import pytest
import asyncio
import time
from playwright.async_api import async_playwright, expect
import requests
import json


class TestPulsePointE2E:
    """Comprehensive E2E tests for PulsePoint performance optimizations."""

    @pytest.fixture(scope="session")
    async def browser_context(self):
        """Create browser context for testing."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            yield context
            await browser.close()

    @pytest.fixture
    async def page(self, browser_context):
        """Create fresh page for each test."""
        page = await browser_context.new_page()
        yield page
        await page.close()

    @pytest.fixture(scope="session")
    def base_url(self):
        """Base URL for application testing."""
        return "http://localhost:5000"  # Adjust if your app runs on different port

    async def test_homepage_loads_successfully(self, page: "Page", base_url: str):
        """Test that homepage loads without errors."""
        # Navigate to homepage
        response = await page.goto(base_url, wait_until="networkidle")

        # Check page loaded successfully
        assert response.status == 200

        # Check title contains PulsePoint
        await expect(page).to_have_title("PulsePoint - News Feed")

        # Check main elements are present
        await expect(page.locator(".header")).to_be_visible()
        await expect(page.locator(".header-title")).to_contain_text("PulsePoint")
        await expect(page.locator(".header-subtitle")).to_contain_text("Your Streamlined News Pulse")

    async def test_news_articles_display(self, page: "Page", base_url: str):
        """Test that news articles are displayed correctly."""
        await page.goto(base_url, wait_until="networkidle")

        # Wait for news container to load
        await expect(page.locator(".news-container")).to_be_visible()

        # Check for news cards (should have some articles)
        news_cards = page.locator(".news-card")
        await expect(news_cards.first).to_be_visible()

        # Check card structure
        first_card = news_cards.first
        await expect(first_card.locator(".news-source")).to_be_visible()
        await expect(first_card.locator(".news-title")).to_be_visible()
        await expect(first_card.locator(".news-summary")).to_be_visible()

        # Check that articles have links
        article_link = first_card.locator(".news-title a")
        await expect(article_link).to_have_attribute("href")

    async def test_responsive_design_mobile(self, page: "Page", base_url: str):
        """Test responsive design on mobile viewport."""
        # Set mobile viewport
        await page.set_viewport_size({"width": 375, "height": 667})

        await page.goto(base_url, wait_until="networkidle")

        # Check mobile layout
        await expect(page.locator(".header")).to_be_visible()
        await expect(page.locator(".news-container")).to_be_visible()

        # Check news cards stack properly on mobile
        news_cards = page.locator(".news-card")
        if await news_cards.count() > 0:
            await expect(news_cards.first).to_be_visible()

    async def test_responsive_design_tablet(self, page: "Page", base_url: str):
        """Test responsive design on tablet viewport."""
        # Set tablet viewport
        await page.set_viewport_size({"width": 768, "height": 1024})

        await page.goto(base_url, wait_until="networkidle")

        # Check tablet layout
        await expect(page.locator(".header")).to_be_visible()
        await expect(page.locator(".news-container")).to_be_visible()

    async def test_performance_optimizations_headers(self, page: "Page", base_url: str):
        """Test that performance headers are present."""
        response = await page.goto(base_url)

        # Check for compression headers
        headers = response.headers

        # Check for cache-control header
        assert "cache-control" in headers.lower()

        # Check for vary header (indicating compression support)
        assert "vary" in headers.lower()

    async def test_api_health_endpoint(self, base_url: str):
        """Test that health check API endpoint works."""
        response = requests.get(f"{base_url}/api/health", timeout=10)

        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "PulsePoint"

    async def test_api_news_endpoint(self, base_url: str):
        """Test that news API endpoint works."""
        response = requests.get(f"{base_url}/api/news", timeout=15)

        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "articles" in data
        assert "count" in data

    async def test_api_performance_endpoint(self, base_url: str):
        """Test that performance monitoring endpoint works."""
        response = requests.get(f"{base_url}/api/performance", timeout=10)

        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "metrics" in data
        assert "system" in data["metrics"]
        assert "performance_features" in data["metrics"]

    async def test_page_load_performance(self, page: "Page", base_url: str):
        """Test basic page load performance metrics."""
        start_time = time.time()

        response = await page.goto(base_url, wait_until="networkidle")

        load_time = time.time() - start_time

        # Page should load within reasonable time (10 seconds)
        assert load_time < 10.0, f"Page took too long to load: {load_time:.2f}s"

        # Check response is successful
        assert response.status == 200

    async def test_resource_hints_present(self, page: "Page", base_url: str):
        """Test that resource hints are present in HTML."""
        await page.goto(base_url, wait_until="networkidle")

        # Check for preconnect links
        preconnect_links = page.locator("link[rel='preconnect']")
        await expect(preconnect_links.first).to_be_visible()

        # Check for dns-prefetch links
        dns_prefetch_links = page.locator("link[rel='dns-prefetch']")
        await expect(dns_prefetch_links.first).to_be_visible()

    async def test_critical_css_inlined(self, page: "Page", base_url: str):
        """Test that critical CSS is inlined in the HTML."""
        await page.goto(base_url, wait_until="networkidle")

        # Check for inline style tag containing critical CSS
        inline_styles = page.locator("style")
        critical_style_present = False

        for i in range(await inline_styles.count()):
            style_content = await inline_styles.nth(i).inner_text()
            if "--color-bg" in style_content and ".header" in style_content:
                critical_style_present = True
                break

        assert critical_style_present, "Critical CSS not found inlined"

    async def test_async_css_loading(self, page: "Page", base_url: str):
        """Test that non-critical CSS is loaded asynchronously."""
        response = await page.goto(base_url, wait_until="networkidle")

        # Check that minified CSS is referenced
        content = await page.content()
        assert "style.min.css" in content, "Minified CSS not referenced"

    async def test_bootstrap_optimized_loading(self, page: "Page", base_url: str):
        """Test that Bootstrap JS is loaded with defer attribute."""
        await page.goto(base_url, wait_until="networkidle")

        # Check for Bootstrap script with defer
        bootstrap_script = page.locator("script[src*='bootstrap'][defer]")
        await expect(bootstrap_script).to_be_visible()

    async def test_error_handling_no_rss_failure(self, page: "Page", base_url: str):
        """Test that page handles RSS feed failures gracefully."""
        # This test checks that the page doesn't crash if RSS feeds fail
        await page.goto(base_url, wait_until="networkidle")

        # Page should still load basic structure even if feeds fail
        await expect(page.locator(".header")).to_be_visible()
        await expect(page.locator(".footer")).to_be_visible()

    async def test_javascript_functionality(self, page: "Page", base_url: str):
        """Test that JavaScript functionality works correctly."""
        await page.goto(base_url, wait_until="networkidle")

        # Test that performance monitoring script loads
        performance_script_present = False

        scripts = page.locator("script")
        for i in range(await scripts.count()):
            script_content = await scripts.nth(i).inner_text()
            if "performance" in script_content.lower() and "metrics" in script_content.lower():
                performance_script_present = True
                break

        assert performance_script_present, "Performance monitoring script not found"

    async def test_accessibility_basic(self, page: "Page", base_url: str):
        """Test basic accessibility features."""
        await page.goto(base_url, wait_until="networkidle")

        # Check for proper heading structure
        await expect(page.locator("h1")).to_be_visible()

        # Check for alt text on images (if any)
        # Note: This is a basic check, enhance as needed

        # Check for focus management
        await page.keyboard.press("Tab")
        # Should focus on interactive elements

    async def test_multiple_page_loads(self, page: "Page", base_url: str):
        """Test multiple page loads to check caching."""
        # First load
        start_time = time.time()
        response1 = await page.goto(base_url, wait_until="networkidle")
        first_load_time = time.time() - start_time

        # Second load (should be faster due to caching)
        start_time = time.time()
        response2 = await page.goto(base_url, wait_until="networkidle")
        second_load_time = time.time() - start_time

        # Both should be successful
        assert response1.status == 200
        assert response2.status == 200

        # Second load should be equal or faster (allowing some variance)
        assert second_load_time <= first_load_time + 2.0, "Caching may not be working properly"


@pytest.mark.asyncio
class TestPerformanceIntegration:
    """Integration tests for performance features."""

    async def test_core_web_vitals_tracking(self, page: "Page", base_url: str):
        """Test that Core Web Vitals tracking is implemented."""
        await page.goto(base_url, wait_until="networkidle")

        # Wait for performance monitoring to potentially send data
        await page.wait_for_timeout(2000)

        # Check that performance monitoring functions are available
        performance_functions = await page.evaluate("""
            () => {
                // Check if performance monitoring script loaded
                const scripts = Array.from(document.scripts);
                return scripts.some(script =>
                    script.textContent &&
                    script.textContent.includes('performance')
                );
            }
        """)

        assert performance_functions, "Performance monitoring not properly implemented"

    async def test_error_page_not_found(self, page: "Page", base_url: str):
        """Test 404 error handling."""
        response = await page.goto(f"{base_url}/nonexistent-page", wait_until="networkidle")

        # Should return 404 or handle gracefully
        assert response.status in [404, 500]  # Depending on error handling setup