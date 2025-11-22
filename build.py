#!/usr/bin/env python3
"""
Build script for PulsePoint.
Handles CSS minification and critical CSS injection.
"""
import os
import re
import sys

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_CSS_DIR = os.path.join(BASE_DIR, 'frontend', 'static', 'css')
TEMPLATE_DIR = os.path.join(BASE_DIR, 'frontend', 'templates')

STYLE_CSS = os.path.join(STATIC_CSS_DIR, 'style.css')
STYLE_MIN_CSS = os.path.join(STATIC_CSS_DIR, 'style.min.css')
CRITICAL_CSS = os.path.join(STATIC_CSS_DIR, 'critical.css')
BASE_HTML = os.path.join(TEMPLATE_DIR, 'base.html')


def minify_css(content):
    """
    Simple CSS minifier using regex.
    Removes comments, newlines, and unnecessary whitespace.
    """
    # Remove comments
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)
    # Remove newlines and tabs
    content = content.replace('\n', '').replace('\r', '').replace('\t', '')
    # Remove whitespace around separators
    content = re.sub(r'\s*([:;{}])\s*', r'\1', content)
    # Remove semicolon before closing brace
    content = content.replace(';}', '}')
    return content.strip()


def build_css():
    """Minify style.css to style.min.css"""
    print(f"Minifying {STYLE_CSS}...")
    try:
        with open(STYLE_CSS, 'r', encoding='utf-8') as f:
            content = f.read()
        
        minified = minify_css(content)
        
        with open(STYLE_MIN_CSS, 'w', encoding='utf-8') as f:
            f.write(minified)
        
        original_size = os.path.getsize(STYLE_CSS)
        minified_size = os.path.getsize(STYLE_MIN_CSS)
        savings = (original_size - minified_size) / original_size * 100
        
        print(f"Done! Saved {savings:.2f}% ({original_size} -> {minified_size} bytes)")
        return True
    except Exception as e:
        print(f"Error minifying CSS: {e}")
        return False


def inject_critical_css():
    """Inject content of critical.css into base.html"""
    print(f"Injecting critical CSS into {BASE_HTML}...")
    try:
        # Read critical CSS
        with open(CRITICAL_CSS, 'r', encoding='utf-8') as f:
            critical_content = minify_css(f.read())
        
        # Read base.html
        with open(BASE_HTML, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Regex to find the style block
        # Looking for <style>.../* Critical CSS... */...</style>
        # We'll replace the entire content of the style tag that looks like the critical css block
        
        # The comment in base.html is: <!-- Critical CSS for above-the-fold content - inlined for performance -->
        # followed by <style>
        
        pattern = r'(<!-- Critical CSS for above-the-fold content - inlined for performance -->\s*<style>)(.*?)(</style>)'
        
        def replacement(match):
            return f"{match.group(1)}\n        {critical_content}\n    {match.group(3)}"
        
        new_html_content = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
        
        if new_html_content == html_content:
            print("Warning: Could not find Critical CSS block in base.html to replace.")
            # Fallback: Try to find just the style tag if the comment is missing or different
            # This is risky, so maybe we just report failure if the specific structure isn't found
            return False
            
        with open(BASE_HTML, 'w', encoding='utf-8') as f:
            f.write(new_html_content)
            
        print("Critical CSS injected successfully.")
        return True
        
    except Exception as e:
        print(f"Error injecting critical CSS: {e}")
        return False


def main():
    print("Starting build process...")
    success = True
    
    if not build_css():
        success = False
        
    if not inject_critical_css():
        success = False
        
    if success:
        print("Build completed successfully!")
        sys.exit(0)
    else:
        print("Build failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()
