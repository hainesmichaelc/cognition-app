import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    os.environ["LOAD_TEST_DATA"] = "true"
    yield
    os.environ.pop("LOAD_TEST_DATA", None)

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def test_repo_id():
    return "testuser/test-repo"

@pytest.fixture
def sample_issue_data():
    return {
        "id": 1001,
        "title": "Test Issue #1: Sample issue for testing dashboard functionality",
        "body": "This is a test issue body for issue #1. It contains sample content for testing the Issue Dashboard.",
        "labels": ["bug", "high-priority", "frontend", "ui", "critical"],
        "number": 1,
        "author": "user1",
        "age_days": 0,
        "status": "open"
    }
