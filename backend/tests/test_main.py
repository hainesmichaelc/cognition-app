import pytest
from fastapi.testclient import TestClient

def test_health_endpoint(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_list_repos_with_test_data(client):
    response = client.get("/api/repos")
    assert response.status_code == 200
    repos = response.json()
    assert len(repos) >= 1
    
    test_repo = next((r for r in repos if r["id"] == "testuser/test-repo"), None)
    assert test_repo is not None
    assert test_repo["owner"] == "testuser"
    assert test_repo["name"] == "test-repo"
    assert test_repo["openIssuesCount"] == 24

def test_api_response_format(client):
    response = client.get("/api/repos")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    data = response.json()
    assert isinstance(data, list)
