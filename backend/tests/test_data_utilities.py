import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any


class TestDataUtilities:
    """Utilities for generating test data, based on existing logic from main.py."""
    
    @staticmethod
    def generate_recent_issues_scenario(count: int = 3) -> List[Dict[str, Any]]:
        """
        Generate recent issues test data based on the scenario from main.py lines 120-124.
        
        Args:
            count: Number of recent issues to generate (default: 3)
            
        Returns:
            List of issue dictionaries with age_days = 0, 1, 2, ...
        """
        now = datetime.now()
        recent_issues = []
        
        for i in range(count):
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
        
        return recent_issues
    
    @staticmethod
    def generate_old_issues_scenario(count: int = 2) -> List[Dict[str, Any]]:
        """
        Generate old issues test data based on the scenario from main.py lines 114-118.
        
        Args:
            count: Number of old issues to generate (default: 2)
            
        Returns:
            List of issue dictionaries with age_days = 365+, 395+, ...
        """
        now = datetime.now()
        old_issues = []
        
        for i in range(count):
            issue_id = 2000 + i
            age_days = 365 + i * 30
            old_issues.append({
                "id": issue_id,
                "title": f"Old Issue #{issue_id - 1999}",
                "body": "This is an old issue to test age-based sorting.",
                "labels": ["legacy", "technical-debt"],
                "number": issue_id - 1999,
                "author": f"user{(issue_id % 5) + 1}",
                "created_at": now - timedelta(days=age_days),
                "age_days": age_days,
                "status": "open"
            })
        
        return old_issues
    
    @staticmethod
    def generate_mixed_age_issues(recent_count: int = 3, old_count: int = 2) -> List[Dict[str, Any]]:
        """
        Generate a mix of recent and old issues for comprehensive sorting tests.
        
        Args:
            recent_count: Number of recent issues (age_days = 0, 1, 2, ...)
            old_count: Number of old issues (age_days = 365+, 395+, ...)
            
        Returns:
            List of all issues mixed together (unsorted)
        """
        recent_issues = TestDataUtilities.generate_recent_issues_scenario(recent_count)
        old_issues = TestDataUtilities.generate_old_issues_scenario(old_count)
        
        all_issues = []
        all_issues.extend(old_issues)
        all_issues.extend(recent_issues)
        
        return all_issues


class TestTestDataUtilities:
    """Test the test data utilities themselves."""
    
    def test_generate_recent_issues_scenario(self):
        """Test the recent issues scenario generator."""
        recent_issues = TestDataUtilities.generate_recent_issues_scenario(3)
        
        assert len(recent_issues) == 3
        
        assert recent_issues[0]["age_days"] == 0
        assert recent_issues[1]["age_days"] == 1
        assert recent_issues[2]["age_days"] == 2
        
        assert recent_issues[0]["title"] == "Recent Issue #1"
        assert recent_issues[1]["title"] == "Recent Issue #2"
        assert recent_issues[2]["title"] == "Recent Issue #3"
        
        for issue in recent_issues:
            assert "new" in issue["labels"]
            assert "urgent" in issue["labels"]
            assert issue["status"] == "open"
    
    def test_generate_old_issues_scenario(self):
        """Test the old issues scenario generator."""
        old_issues = TestDataUtilities.generate_old_issues_scenario(2)
        
        assert len(old_issues) == 2
        
        assert old_issues[0]["age_days"] == 365
        assert old_issues[1]["age_days"] == 395
        
        assert old_issues[0]["title"] == "Old Issue #1"
        assert old_issues[1]["title"] == "Old Issue #2"
        
        for issue in old_issues:
            assert "legacy" in issue["labels"]
            assert "technical-debt" in issue["labels"]
            assert issue["status"] == "open"
    
    def test_generate_mixed_age_issues(self):
        """Test the mixed age issues generator."""
        mixed_issues = TestDataUtilities.generate_mixed_age_issues(3, 2)
        
        assert len(mixed_issues) == 5
        
        age_days_list = [issue["age_days"] for issue in mixed_issues]
        
        assert 0 in age_days_list
        assert 1 in age_days_list
        assert 2 in age_days_list
        
        assert 365 in age_days_list
        assert 395 in age_days_list
    
    def test_sorting_mixed_issues(self):
        """Test that mixed issues can be sorted correctly."""
        mixed_issues = TestDataUtilities.generate_mixed_age_issues(3, 2)
        
        sorted_issues = sorted(mixed_issues, key=lambda x: x["created_at"], reverse=True)
        
        age_days_sorted = [issue["age_days"] for issue in sorted_issues]
        assert age_days_sorted == [0, 1, 2, 365, 395]
        
        expected_titles = [
            "Recent Issue #1",  # age_days = 0
            "Recent Issue #2",  # age_days = 1
            "Recent Issue #3",  # age_days = 2
            "Old Issue #1",     # age_days = 365
            "Old Issue #2"      # age_days = 395
        ]
        actual_titles = [issue["title"] for issue in sorted_issues]
        assert actual_titles == expected_titles
