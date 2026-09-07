"""
Guards the committed CSS build artifacts against drift from their sources.

style.min.css and the critical CSS inlined into base.html are both generated
by build.py at the repo root and committed. Nothing else in the pipeline
regenerates or compares them, so without these checks the served stylesheet
can silently fall behind style.css — as it did, by 3,552 characters.

Regenerate with:  python build.py
"""
import importlib.util
from pathlib import Path

import pytest

BUILD_PY = Path(__file__).resolve().parents[2] / 'build.py'

REGENERATE = 'Run `python build.py` from the repo root to regenerate.'


@pytest.fixture(scope='module')
def build():
    """Load build.py as a module without executing its __main__ block."""
    spec = importlib.util.spec_from_file_location('pulsepoint_build', BUILD_PY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_style_min_css_matches_source(build):
    """style.min.css must be a current minification of style.css."""
    source = Path(build.STYLE_CSS).read_text(encoding='utf-8')
    committed = Path(build.STYLE_MIN_CSS).read_text(encoding='utf-8')

    assert committed == build.minify_css(source), (
        f'style.min.css is stale relative to style.css. {REGENERATE}'
    )


def test_critical_css_inlined_in_base_template_matches_source(build):
    """The <style> block inlined into base.html must match critical.css."""
    import re

    html = Path(build.BASE_HTML).read_text(encoding='utf-8')
    pattern = (
        r'<!-- Critical CSS for above-the-fold content - inlined for performance -->'
        r'\s*<style>(.*?)</style>'
    )

    match = re.search(pattern, html, flags=re.DOTALL)
    assert match, f'Critical CSS block not found in base.html. {REGENERATE}'

    source = Path(build.CRITICAL_CSS).read_text(encoding='utf-8')

    assert match.group(1).strip() == build.minify_css(source), (
        f'Inlined critical CSS is stale relative to critical.css. {REGENERATE}'
    )
