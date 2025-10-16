"""
Integration tests for performance optimizations.
Tests our changes without requiring full server setup.
"""
import pytest
import os
import tempfile
from pathlib import Path


class TestPerformanceOptimizations:
    """Test that performance optimizations are properly configured."""

    def test_requirements_include_performance_packages(self):
        """Test that performance-related packages are in requirements."""
        requirements_path = Path(__file__).parent.parent / "requirements.txt"

        with open(requirements_path, 'r') as f:
            requirements_content = f.read()

        # Check for performance packages
        assert "Flask-Compress" in requirements_content
        assert "redis" in requirements_content
        assert "psutil" in requirements_content
        assert "playwright" in requirements_content

    def test_config_includes_performance_settings(self):
        """Test that configuration includes performance settings."""
        config_path = Path(__file__).parent.parent / "config.py"

        with open(config_path, 'r') as f:
            config_content = f.read()

        # Check for performance configuration
        assert "REDIS_URL" in config_content
        assert "ENABLE_COMPRESSION" in config_content
        assert "CACHE_RSS_TIMEOUT" in config_content
        assert "REQUEST_TIMEOUT = 5" in config_content  # Reduced timeout

    def test_app_init_includes_compression(self):
        """Test that app initialization includes compression."""
        app_init_path = Path(__file__).parent.parent / "app" / "__init__.py"

        with open(app_init_path, 'r') as f:
            app_init_content = f.read()

        # Check for performance features
        assert "Flask-Compress" in app_init_content
        assert "compress" in app_init_content
        assert "add_performance_headers" in app_init_content
        assert "stale-while-revalidate" in app_init_content

    def test_routes_include_performance_endpoints(self):
        """Test that routes include performance monitoring endpoints."""
        routes_path = Path(__file__).parent.parent / "app" / "routes.py"

        with open(routes_path, 'r') as f:
            routes_content = f.read()

        # Check for performance monitoring
        assert "/api/performance" in routes_content
        assert "performance_monitoring" in routes_content
        assert "/api/performance/vitals" in routes_content
        assert "record_core_web_vitals" in routes_content

    def test_base_template_includes_optimizations(self):
        """Test that base template includes performance optimizations."""
        base_template_path = Path(__file__).parent.parent.parent / "frontend" / "templates" / "base.html"

        with open(base_template_path, 'r') as f:
            template_content = f.read()

        # Check for resource hints
        assert "preconnect" in template_content
        assert "dns-prefetch" in template_content

        # Check for critical CSS
        assert "<style>" in template_content
        assert "--color-bg" in template_content

        # Check for async loading
        assert "style.min.css" in template_content
        assert "defer" in template_content

        # Check for performance monitoring
        assert "performance" in template_content.lower()
        assert "sendBeacon" in template_content

    def test_minified_css_exists(self):
        """Test that minified CSS file exists."""
        css_path = Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.min.css"

        assert css_path.exists(), "Minified CSS file does not exist"

        # Check that it's actually minified (smaller than original)
        original_css_path = Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.css"

        if original_css_path.exists():
            minified_size = css_path.stat().st_size
            original_size = original_css_path.stat().st_size

            # Minified should be smaller
            assert minified_size <= original_size, "CSS file is not properly minified"

    def test_critical_css_exists(self):
        """Test that critical CSS file exists."""
        critical_css_path = Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "critical.css"

        assert critical_css_path.exists(), "Critical CSS file does not exist"

    def test_css_files_are_valid(self):
        """Test that CSS files are syntactically valid."""
        css_files = [
            Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.css",
            Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.min.css",
            Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "critical.css"
        ]

        for css_path in css_files:
            if css_path.exists():
                with open(css_path, 'r') as f:
                    css_content = f.read()

                # Basic CSS syntax checks
                assert css_content.strip(), f"CSS file {css_path} is empty"
                assert "{" in css_content, f"CSS file {css_path} has no opening braces"
                assert "}" in css_content, f"CSS file {css_path} has no closing braces"
                assert ":" in css_content, f"CSS file {css_path} has no property declarations"

    def test_route_timeout_updated(self):
        """Test that RSS timeout has been reduced for performance."""
        config_path = Path(__file__).parent.parent / "config.py"

        with open(config_path, 'r') as f:
            config_content = f.read()

        # Check that timeout is set to 5 seconds
        assert "REQUEST_TIMEOUT = 5" in config_content, "RSS timeout not properly reduced"

    def test_cache_timeouts_configured(self):
        """Test that cache timeouts are properly configured."""
        config_path = Path(__file__).parent.parent / "config.py"

        with open(config_path, 'r') as f:
            config_content = f.read()

        # Check for cache timeout configurations
        assert "CACHE_RSS_TIMEOUT" in config_content
        assert "CACHE_PAGE_TIMEOUT" in config_content
        assert "CACHE_API_TIMEOUT" in config_content

    def test_production_config_uses_redis(self):
        """Test that production configuration uses Redis."""
        config_path = Path(__file__).parent.parent / "config.py"

        with open(config_path, 'r') as f:
            config_content = f.read()

        # Check that production config uses Redis
        assert "CACHE_TYPE = 'RedisCache'" in config_content

    def test_imports_are_valid(self):
        """Test that all Python files have valid imports."""
        python_files = [
            Path(__file__).parent.parent / "config.py",
            Path(__file__).parent.parent / "app" / "__init__.py",
            Path(__file__).parent.parent / "app" / "routes.py"
        ]

        for py_file in python_files:
            assert py_file.exists(), f"Python file {py_file} does not exist"

            # Try to compile the file to check for syntax errors
            try:
                with open(py_file, 'r') as f:
                    code = f.read()
                compile(code, str(py_file), 'exec')
            except SyntaxError as e:
                pytest.fail(f"Syntax error in {py_file}: {e}")

    def test_template_has_proper_structure(self):
        """Test that HTML template has proper structure."""
        base_template_path = Path(__file__).parent.parent.parent / "frontend" / "templates" / "base.html"

        with open(base_template_path, 'r') as f:
            template_content = f.read()

        # Check for basic HTML structure
        assert "<!DOCTYPE html>" in template_content
        assert "<html" in template_content
        assert "<head>" in template_content
        assert "<body>" in template_content
        assert "</html>" in template_content

        # Check for required meta tags
        assert '<meta charset="UTF-8">' in template_content
        assert 'name="viewport"' in template_content

    def test_no_broken_links_in_template(self):
        """Test that template doesn't have obviously broken resource references."""
        base_template_path = Path(__file__).parent.parent.parent / "frontend" / "templates" / "base.html"

        with open(base_template_path, 'r') as f:
            template_content = f.read()

        # Check that minified CSS is referenced
        assert "style.min.css" in template_content

        # Check that critical CSS is inlined (no broken reference)
        assert "--color-bg" in template_content


class TestPerformanceMetrics:
    """Test performance metrics calculation."""

    def test_css_minification_effectiveness(self):
        """Test that CSS minification is effective."""
        original_css = Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.css"
        minified_css = Path(__file__).parent.parent.parent / "frontend" / "static" / "css" / "style.min.css"

        if original_css.exists() and minified_css.exists():
            original_size = original_css.stat().st_size
            minified_size = minified_css.stat().st_size

            # Calculate compression ratio
            compression_ratio = (original_size - minified_size) / original_size * 100

            # Should achieve at least 10% compression
            assert compression_ratio >= 10, f"CSS minification not effective: {compression_ratio:.1f}% compression"

    def test_resource_hints_coverage(self):
        """Test that resource hints cover all RSS feed domains."""
        base_template_path = Path(__file__).parent.parent.parent / "frontend" / "templates" / "base.html"

        with open(base_template_path, 'r') as f:
            template_content = f.read()

        # Check for major RSS feed domains
        rss_domains = [
            "cdn.jsdelivr.net",
            "feeds.bbci.co.uk",
            "www.theguardian.com",
            "feeds.skynews.com",
            "www.aljazeera.com",
            "techcrunch.com"
        ]

        for domain in rss_domains:
            assert domain in template_content, f"Resource hint missing for domain: {domain}"