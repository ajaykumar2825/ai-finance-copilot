"""Minimal smoke test so `pytest backend` collects and passes in CI.

This intentionally avoids importing backend modules that require environment
configuration (e.g. ``backend.config``), so the suite runs in a clean CI
environment without a database or secrets.
"""


def test_smoke() -> None:
    """Pytest is wired up and collecting tests from the backend workspace."""
    assert True
