import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app, issues_store, repos_store

client = TestClient(app)

@pytest.fixture
def setup_test_repo():
    """Set up a test repository with issues for sorting tests."""
    test_repo_id = "test-owner/test-repo"
    
    repos_store[test_repo_id] = {
        "id": test_repo_id,
        "owner": "test-owner",
        "name": "test-repo",
        "url": "https://github.com/test-owner/test-repo",
        "connectedAt": datetime.now(),
        "openIssuesCount": 0,
        "githubPat": "test-token"
    }
    
    now = datetime.now()
    test_issues = [
        {
            "id": 1,
            "title": "Very Recent Issue",
            "body": "This issue was created today",
            "labels": ["urgent", "new"],
            "number": 1,
            "author": "user1",
            "created_at": now,  # 0 days old
            "age_days": 0,
            "status": "open"
        },
        {
            "id": 2,
            "title": "Recent Issue",
            "body": "This issue was created yesterday",
            "labels": ["bug"],
            "number": 2,
            "author": "user2",
            "created_at": now - timedelta(days=1),  # 1 day old
            "age_days": 1,
            "status": "open"
        },
        {
            "id": 3,
            "title": "Week Old Issue",
            "body": "This issue is a week old",
            "labels": ["enhancement"],
            "number": 3,
            "author": "user3",
            "created_at": now - timedelta(days=7),  # 7 days old
            "age_days": 7,
            "status": "open"
        },
        {
            "id": 4,
            "title": "Old Issue",
            "body": "This issue is very old",
            "labels": ["legacy"],
            "number": 4,
            "author": "user4",
            "created_at": now - timedelta(days=365),  # 365 days old
            "age_days": 365,
            "status": "open"
        },
        {
            "id": 5,
            "title": "Ancient Issue",
            "body": "This issue is ancient",
            "labels": ["legacy", "technical-debt"],
            "number": 5,
            "author": "user5",
            "created_at": now - timedelta(days=500),  # 500 days old
            "age_days": 500,
            "status": "open"
        }
    ]
    
    issues_store[test_repo_id] = test_issues
    repos_store[test_repo_id]["openIssuesCount"] = len(test_issues)
    
    yield test_repo_id
    
    if test_repo_id in issues_store:
        del issues_store[test_repo_id]
    if test_repo_id in repos_store:
        del repos_store[test_repo_id]


class TestIssueSorting:
    """Test suite for validating issue sorting functionality."""
    
    def test_issues_sorted_by_created_at_descending(self, setup_test_repo):
        """Test that issues are sorted by creation date, most recent first."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response = client.get(f"/api/repos/{owner}/{name}/issues")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 5
        
        expected_ages = [0, 1, 7, 365, 500]
        actual_ages = [issue["age_days"] for issue in issues]
        assert actual_ages == expected_ages, f"Expected ages {expected_ages}, got {actual_ages}"
        
        expected_titles = [
            "Very Recent Issue",
            "Recent Issue", 
            "Week Old Issue",
            "Old Issue",
            "Ancient Issue"
        ]
        actual_titles = [issue["title"] for issue in issues]
        assert actual_titles == expected_titles
    
    def test_recent_issues_appear_first(self, setup_test_repo):
        """Test that recent issues (0-2 days old) appear at the top."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response = client.get(f"/api/repos/{owner}/{name}/issues")
        assert response.status_code == 200
        
        issues = response.json()
        
        assert issues[0]["age_days"] == 0
        assert issues[1]["age_days"] == 1
        
        for issue in issues[2:]:
            assert issue["age_days"] > 2
    
    def test_pagination_maintains_sorting(self, setup_test_repo):
        """Test that pagination maintains correct sorting order."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response_page1 = client.get(f"/api/repos/{owner}/{name}/issues?page=1&pageSize=2")
        assert response_page1.status_code == 200
        page1_issues = response_page1.json()
        
        response_page2 = client.get(f"/api/repos/{owner}/{name}/issues?page=2&pageSize=2")
        assert response_page2.status_code == 200
        page2_issues = response_page2.json()
        
        assert len(page1_issues) == 2
        assert page1_issues[0]["age_days"] == 0
        assert page1_issues[1]["age_days"] == 1
        
        assert len(page2_issues) == 2
        assert page2_issues[0]["age_days"] == 7
        assert page2_issues[1]["age_days"] == 365
        
        all_ages_page1 = [issue["age_days"] for issue in page1_issues]
        all_ages_page2 = [issue["age_days"] for issue in page2_issues]
        
        assert max(all_ages_page1) < min(all_ages_page2)
    
    def test_search_maintains_sorting(self, setup_test_repo):
        """Test that search filtering maintains chronological sorting."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response = client.get(f"/api/repos/{owner}/{name}/issues?q=Issue")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 5
        
        ages = [issue["age_days"] for issue in issues]
        assert ages == sorted(ages), "Issues should remain sorted by age even with search"
        assert ages == [0, 1, 7, 365, 500]
    
    def test_label_filtering_maintains_sorting(self, setup_test_repo):
        """Test that label filtering maintains chronological sorting."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response = client.get(f"/api/repos/{owner}/{name}/issues?label=legacy")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 2
        
        ages = [issue["age_days"] for issue in issues]
        assert ages == [365, 500], "Legacy issues should be sorted by age"
        
        titles = [issue["title"] for issue in issues]
        assert "Old Issue" in titles
        assert "Ancient Issue" in titles
    
    def test_empty_results_handling(self, setup_test_repo):
        """Test that empty search results are handled correctly."""
        test_repo_id = setup_test_repo
        owner, name = test_repo_id.split("/")
        
        response = client.get(f"/api/repos/{owner}/{name}/issues?q=nonexistent")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 0
        assert issues == []
    
    def test_mixed_status_sorting(self, setup_test_repo):
        """Test sorting with mixed open/closed status issues."""
        test_repo_id = setup_test_repo
        
        closed_issue = {
            "id": 6,
            "title": "Recent Closed Issue",
            "body": "This closed issue should still sort by date",
            "labels": ["bug", "fixed"],
            "number": 6,
            "author": "user6",
            "created_at": datetime.now() - timedelta(hours=12),  # 0.5 days old
            "age_days": 0,
            "status": "closed"
        }
        
        issues_store[test_repo_id].append(closed_issue)
        
        owner, name = test_repo_id.split("/")
        response = client.get(f"/api/repos/{owner}/{name}/issues")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 6
        
        closed_issue_found = None
        for i, issue in enumerate(issues):
            if issue["status"] == "closed":
                closed_issue_found = i
                break
        
        assert closed_issue_found is not None
        assert closed_issue_found <= 1, "Recent closed issue should appear near top"


class TestRecentIssuesScenario:
    """Test the specific 'recent_issues' test data scenario."""
    
    def test_recent_issues_test_data_sorting(self, setup_test_repo):
        """Test that recent issues appear first in any repository."""
        test_repo_id = setup_test_repo
        
        now = datetime.now()
        recent_test_issues = [
            {
                "id": 10,
                "title": "Recent Issue #23",
                "body": "This is a recent issue to test recent sorting.",
                "labels": ["new", "urgent"],
                "number": 23,
                "author": "user1",
                "created_at": now,  # 0 days old
                "age_days": 0,
                "status": "open"
            },
            {
                "id": 11,
                "title": "Recent Issue #24",
                "body": "This is a recent issue to test recent sorting.",
                "labels": ["new", "urgent"],
                "number": 24,
                "author": "user2",
                "created_at": now - timedelta(days=1),  # 1 day old
                "age_days": 1,
                "status": "open"
            },
            {
                "id": 12,
                "title": "Recent Issue #25",
                "body": "This is a recent issue to test recent sorting.",
                "labels": ["new", "urgent"],
                "number": 25,
                "author": "user3",
                "created_at": now - timedelta(days=2),  # 2 days old
                "age_days": 2,
                "status": "open"
            }
        ]
        
        issues_store[test_repo_id].extend(recent_test_issues)
        
        owner, name = test_repo_id.split("/")
        response = client.get(f"/api/repos/{owner}/{name}/issues")
        assert response.status_code == 200
        
        issues = response.json()
        assert len(issues) == 8  # 5 original + 3 recent
        
        recent_issues = [issue for issue in issues if "Recent Issue" in issue["title"]]
        assert len(recent_issues) >= 3, "Should have at least 3 recent issues from test data"
        
        recent_count = 0
        for issue in issues:
            if issue["age_days"] <= 2:
                recent_count += 1
            else:
                break  # Once we hit an issue older than 2 days, all subsequent should be older
        
        assert recent_count >= 4, f"Should have at least 4 recent issues (0-2 days old), found {recent_count}"
        
        ages = [issue["age_days"] for issue in issues]
        assert ages == sorted(ages), f"Issues should be sorted by age, got ages: {ages}"
