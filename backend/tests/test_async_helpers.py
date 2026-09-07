"""
Unit tests for async execution helpers.
Each case is exercised with and without an already-running event loop,
since the two states take different code paths.
"""
import asyncio

import pytest

from app.utils.async_helpers import run_coro


async def _echo(value, suffix=''):
    """Minimal async callable for exercising run_coro."""
    await asyncio.sleep(0)
    return f"{value}{suffix}"


async def _boom():
    """Async callable that always fails."""
    raise ValueError('coroutine failed')


class TestRunCoroWithoutRunningLoop:
    """Direct path: no event loop in this thread."""

    def test_returns_coroutine_result(self):
        assert run_coro(_echo, 'ok') == 'ok'

    def test_forwards_args_and_kwargs(self):
        assert run_coro(_echo, 'a', suffix='b') == 'ab'

    def test_propagates_exception(self):
        with pytest.raises(ValueError, match='coroutine failed'):
            run_coro(_boom)


class TestRunCoroInsideRunningLoop:
    """Fallback path: asyncio.run() cannot nest, so a worker thread runs it."""

    async def test_returns_coroutine_result(self):
        assert run_coro(_echo, 'ok') == 'ok'

    async def test_forwards_args_and_kwargs(self):
        assert run_coro(_echo, 'a', suffix='b') == 'ab'

    async def test_propagates_exception(self):
        with pytest.raises(ValueError, match='coroutine failed'):
            run_coro(_boom)

    async def test_builds_coroutine_exactly_once(self):
        """The fallback must not build a coroutine it never awaits."""
        built = 0
        ran = 0

        async def tracked():
            nonlocal ran
            ran += 1
            return 'done'

        def factory():
            nonlocal built
            built += 1
            return tracked()

        assert run_coro(factory) == 'done'
        assert built == 1
        assert ran == 1
