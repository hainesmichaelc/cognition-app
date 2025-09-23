import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app, repos_store, issues_store


class TestIssueAPIEndpoints:
    """Test suite for issue API endpoints, focusing on sorting functionality."""
    
    def setup_method(self):
        """Clear stores before each test."""
        repos_store.clear()
        issues_store.clear()
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI app."""
        return TestClient(app)
    
    def test_get_issues_endpoint_sorting(self, client):
        """Test that the /api/repos/{owner}/{name}/issues endpoint returns sorted issues."""
        repo_id = "testuser/test-repo"
        repos_store[repo_id] = {
            "id": repo_id,
            "owner": "testuser",
            "name": "test-repo",
            "url": "https://github.com/testuser/test-repo",
            "connectedAt": datetime.now(),
            "openIssuesCount": 3,
            "githubPat": "test_token"
        }
        
        now = datetime.now()
        test_issues = [
            {
                "id": 2,
                "title": "Middle Issue",
                "body": "This is a middle issue",
                "labels": ["feature"],
                "number": 2,
                "author": "user2",
                "created_at": now - timedelta(days=2),
                "age_days": 2,
                "status": "open"
            },
            {
                "id": 1,
                "title": "Newest Issue",
                "body": "This is the newest issue",
                "labels": ["bug"],
                "number": 1,
                "author": "user1",
                "created_at": now,
                "age_days": 0,
                "status": "open"
            },
            {
                "id": 3,
                "title": "Oldest Issue",
                "body": "This is the oldest issue",
                "labels": ["enhancement"],
                "number": 3,
                "author": "user3",
                "created_at": now - timedelta(days=5),
                "age_days": 5,
                "status": "open"
            }
        ]
        
        issues_store[repo_id] = test_issues
        
        response = client.get("/api/repos/testuser/test-repo/issues")
        
        assert response.status_code == 200
        issues = response.json()
        
        assert len(issues) == 3
        assert issues[0]["age_days"] == 0  # Newest issue first
        assert issues[1]["age_days"] == 2  # Middle issue second
        assert issues[2]["age_days"] == 5  # Oldest issue last
        
        assert issues[0]["title"] == "Newest Issue"
        assert issues[1]["title"] == "Middle Issue"
        assert issues[2]["title"] == "Oldest Issue"
    
    def test_recent_issues_scenario_api(self, client):
        """Test the API with the existing 'recent_issues' test data scenario."""
        repo_id = "testuser/test-repo"
        repos_store[repo_id] = {
            "id": repo_id,
            "owner": "testuser",
            "name": "test-repo",
            "url": "https://github.com/testuser/test-repo",
            "connectedAt": datetime.now(),
            "openIssuesCount": 3,
            "githubPat": "test_token"
        }
        
        now = datetime.now()
        recent_issues = []
        
        for i in range(3):  # 3 recent issues as per scenario
            issue_id = 1000 + i
            recent_issues.append({
                "id": issue_id,
                "title": f"Recent Issue #{issue_id - 999}",
                "body": "This is a recent issue to test recent sorting.",
                "labels": ["new", "urgent"],
                "number": issue_id - 999,
                "author": f"user{(issue_id % 5) + 1}",
                "created_at": now - timedelta(days=i),
                "age_days": i,
                "status": "open"
            })
        
        issues_store[repo_id] = [recent_issues[2], recent_issues[1], recent_issues[0]]
        
        response = client.get("/api/repos/testuser/test-repo/issues")
        
        assert response.status_code == 200
        issues = response.json()
        
        assert len(issues) == 3
        assert issues[0]["age_days"] == 0  # Recent Issue #1 (most recent)
        assert issues[1]["age_days"] == 1  # Recent Issue #2
        assert issues[2]["age_days"] == 2  # Recent Issue #3 (oldest of recent)
        
        assert issues[0]["title"] == "Recent Issue #1"
        assert issues[1]["title"] == "Recent Issue #2"
        assert issues[2]["title"] == "Recent Issue #3"
        
        for issue in issues:
            assert "new" in issue["labels"]
            assert "urgent" in issue["labels"]
    
    def test_api_pagination_with_sorting(self, client):
        """Test that pagination works correctly with sorted issues."""
        repo_id = "testuser/test-repo"
        repos_store[repo_id] = {
            "id": repo_id,
            "owner": "testuser",
            "name": "test-repo",
            "url": "https://github.com/testuser/test-repo",
            "connectedAt": datetime.now(),
            "openIssuesCount": 5,
            "githubPat": "test_token"
        }
        
        now = datetime.now()
        test_issues = []
        for i in range(5):
            test_issues.append({
                "id": i + 1,
                "title": f"Issue #{i + 1}",
                "body": f"This is issue {i + 1}",
                "labels": ["test"],
                "number": i + 1,
                "author": "user1",
                "created_at": now - timedelta(days=i),
                "age_days": i,
                "status": "open"
            })
        
        issues_store[repo_id] = [test_issues[3], test_issues[1], test_issues[4], test_issues[0], test_issues[2]]
        
        response = client.get("/api/repos/testuser/test-repo/issues?page=1&pageSize=2")
        assert response.status_code == 200
        issues = response.json()
        
        assert len(issues) == 2
        assert issues[0]["age_days"] == 0  # Most recent
        assert issues[1]["age_days"] == 1  # Second most recent
        
        response = client.get("/api/repos/testuser/test-repo/issues?page=2&pageSize=2")
        assert response.status_code == 200
        issues = response.json()
        
        assert len(issues) == 2
        assert issues[0]["age_days"] == 2
        assert issues[1]["age_days"] == 3
    
    def test_api_search_with_sorting(self, client):
        """Test that search functionality maintains proper sorting."""
        repo_id = "testuser/test-repo"
        repos_store[repo_id] = {
            "id": repo_id,
            "owner": "testuser",
            "name": "test-repo",
            "url": "https://github.com/testuser/test-repo",
            "connectedAt": datetime.now(),
            "openIssuesCount": 3,
            "githubPat": "test_token"
        }
        
        now = datetime.now()
        test_issues = [
            {
                "id": 1,
                "title": "Old Bug Report",
                "body": "This is an old bug",
                "labels": ["bug"],
                "number": 1,
                "author": "user1",
                "created_at": now - timedelta(days=5),
                "age_days": 5,
                "status": "open"
            },
            {
                "id": 2,
                "title": "New Bug Found",
                "body": "This is a new bug",
                "labels": ["bug"],
                "number": 2,
                "author": "user2",
                "created_at": now,
                "age_days": 0,
                "status": "open"
            },
            {
                "id": 3,
                "title": "Feature Request",
                "body": "This is not a bug",
                "labels": ["feature"],
                "number": 3,
                "author": "user3",
                "created_at": now - timedelta(days=2),
                "age_days": 2,
                "status": "open"
            }
        ]
        
        issues_store[repo_id] = test_issues
        
        response = client.get("/api/repos/testuser/test-repo/issues?q=bug")
        assert response.status_code == 200
        issues = response.json()
        
        assert len(issues) == 2
        assert issues[0]["age_days"] == 0  # New Bug Found (most recent)
        assert issues[1]["age_days"] == 5  # Old Bug Report (older)
        assert issues[0]["title"] == "New Bug Found"
        assert issues[1]["title"] == "Old Bug Report"
    
    def test_api_repository_not_found(self, client):
        """Test API response when repository is not found."""
        response = client.get("/api/repos/nonexistent/repo/issues")
        assert response.status_code == 404
        assert "Repository not found" in response.json()["detail"]
