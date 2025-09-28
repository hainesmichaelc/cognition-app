import pytest
from fastapi.testclient import TestClient

class TestRepoEndpoints:
    
    def test_connect_repo_validation(self, client):
        invalid_data = {
            "repoUrl": "not-a-url",
            "githubPat": "invalid-token"
        }
        response = client.post("/api/repos/connect", json=invalid_data)
        assert response.status_code == 422

    def test_connect_repo_missing_fields(self, client):
        incomplete_data = {
            "repoUrl": "https://github.com/test/repo"
        }
        response = client.post("/api/repos/connect", json=incomplete_data)
        assert response.status_code == 422

    def test_delete_repo_existing(self, client, test_repo_id):
        response = client.delete(f"/api/repos/{test_repo_id}")
        assert response.status_code in [200, 404]

    def test_delete_repo_nonexistent(self, client):
        response = client.delete("/api/repos/nonexistent/repo")
        assert response.status_code == 404

    def test_resync_repo_existing(self, client, test_repo_id):
        response = client.post(f"/api/repos/{test_repo_id}/resync", json={})
        assert response.status_code in [200, 400, 404]

    def test_resync_repo_nonexistent(self, client):
        response = client.post("/api/repos/nonexistent/repo/resync", json={})
        assert response.status_code == 404

    def test_list_repos_structure(self, client):
        response = client.get("/api/repos")
        assert response.status_code == 200
        
        repos = response.json()
        assert isinstance(repos, list)
        
        if repos:
            repo = repos[0]
            required_fields = ["id", "owner", "name", "url", "connectedAt", "openIssuesCount"]
            for field in required_fields:
                assert field in repo
