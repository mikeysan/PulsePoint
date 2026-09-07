"""
Async execution helpers for PulsePoint application.
Bridges async services into Flask's synchronous request handlers.
"""
import asyncio
import concurrent.futures


def run_coro(coro_fn, *args, **kwargs):
    """
    Run an async callable to completion from synchronous code.

    asyncio.run() cannot nest inside an already-running event loop, which is
    the case under async test runners. When a loop is running, the call is
    isolated in a worker thread that owns its own loop.

    Takes the callable rather than a coroutine object so the coroutine is
    built only in the context that awaits it — passing a coroutine in would
    orphan it whenever the direct path is unavailable.

    Args:
        coro_fn (callable): Async function (or any callable returning an
            awaitable) to invoke
        *args: Positional arguments forwarded to coro_fn
        **kwargs: Keyword arguments forwarded to coro_fn

    Returns:
        Any: The coroutine's return value
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        # No loop in this thread — run it directly.
        return asyncio.run(coro_fn(*args, **kwargs))

    # A loop is already running here, so hand the work to a thread that
    # can start one of its own.
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: asyncio.run(coro_fn(*args, **kwargs))).result()
