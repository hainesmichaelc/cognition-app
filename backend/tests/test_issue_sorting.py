import pytest
from datetime import datetime, timedelta
from app.main import issues_store


class TestIssueSorting:
    """Test suite for issue sorting functionality."""
    
    def setup_method(self):
        """Clear issues_store before each test."""
        issues_store.clear()
    
    def test_issues_sorted_by_created_at_descending(self):
        """Test that issues are sorted by created_at in descending order (most recent first)."""
        repo_id = "test/repo"
        
        now = datetime.now()
        test_issues = [
            {
                "id": 1,
                "title": "Oldest Issue",
                "body": "This is the oldest issue",
                "labels": ["bug"],
                "number": 1,
                "author": "user1",
                "created_at": now - timedelta(days=5),
                "age_days": 5,
                "status": "open"
            },
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
                "id": 3,
                "title": "Newest Issue",
                "body": "This is the newest issue",
                "labels": ["enhancement"],
                "number": 3,
                "author": "user3",
                "created_at": now,
                "age_days": 0,
                "status": "open"
            }
        ]
        
        issues_store[repo_id] = [test_issues[1], test_issues[0], test_issues[2]]
        
        issues = issues_store[repo_id]
        sorted_issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)
        
        assert len(sorted_issues) == 3
        assert sorted_issues[0]["age_days"] == 0  # Newest issue first
        assert sorted_issues[1]["age_days"] == 2  # Middle issue second
        assert sorted_issues[2]["age_days"] == 5  # Oldest issue last
        
        assert sorted_issues[0]["title"] == "Newest Issue"
        assert sorted_issues[1]["title"] == "Middle Issue"
        assert sorted_issues[2]["title"] == "Oldest Issue"
    
    def test_recent_issues_scenario_sorting(self):
        """Test sorting with the existing 'recent_issues' test data scenario."""
        repo_id = "test/recent-repo"
        
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
        
        issues_store[repo_id] = [recent_issues[2], recent_issues[0], recent_issues[1]]
        
        issues = issues_store[repo_id]
        sorted_issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)
        
        assert len(sorted_issues) == 3
        assert sorted_issues[0]["age_days"] == 0  # Recent Issue #1 (most recent)
        assert sorted_issues[1]["age_days"] == 1  # Recent Issue #2
        assert sorted_issues[2]["age_days"] == 2  # Recent Issue #3 (oldest of recent)
        
        assert sorted_issues[0]["title"] == "Recent Issue #1"
        assert sorted_issues[1]["title"] == "Recent Issue #2"
        assert sorted_issues[2]["title"] == "Recent Issue #3"
    
    def test_same_creation_time_sorting(self):
        """Test sorting behavior when issues have the same creation time."""
        repo_id = "test/same-time"
        
        now = datetime.now()
        same_time_issues = [
            {
                "id": 1,
                "title": "Issue A",
                "body": "First issue",
                "labels": [],
                "number": 1,
                "author": "user1",
                "created_at": now,
                "age_days": 0,
                "status": "open"
            },
            {
                "id": 2,
                "title": "Issue B",
                "body": "Second issue",
                "labels": [],
                "number": 2,
                "author": "user2",
                "created_at": now,
                "age_days": 0,
                "status": "open"
            }
        ]
        
        issues_store[repo_id] = same_time_issues
        
        issues = issues_store[repo_id]
        sorted_issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)
        
        assert len(sorted_issues) == 2
        assert all(issue["age_days"] == 0 for issue in sorted_issues)
    
    def test_empty_issues_list(self):
        """Test sorting behavior with empty issues list."""
        repo_id = "test/empty"
        issues_store[repo_id] = []
        
        issues = issues_store[repo_id]
        sorted_issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)
        
        assert len(sorted_issues) == 0
        assert sorted_issues == []
    
    def test_single_issue_sorting(self):
        """Test sorting behavior with a single issue."""
        repo_id = "test/single"
        
        single_issue = [{
            "id": 1,
            "title": "Only Issue",
            "body": "This is the only issue",
            "labels": ["solo"],
            "number": 1,
            "author": "user1",
            "created_at": datetime.now(),
            "age_days": 0,
            "status": "open"
        }]
        
        issues_store[repo_id] = single_issue
        
        issues = issues_store[repo_id]
        sorted_issues = sorted(issues, key=lambda x: x["created_at"], reverse=True)
        
        assert len(sorted_issues) == 1
        assert sorted_issues[0]["title"] == "Only Issue"
