import pytest
from fastapi.testclient import TestClient

class TestIssueEndpoints:
    
    def test_get_issues_basic(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues")
        assert response.status_code == 200
        
        data = response.json()
        assert "issues" in data
        assert "total_available_estimate" in data
        assert "has_more_from_github" in data
        assert len(data["issues"]) > 0

    def test_get_issues_pagination(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?page=1&pageSize=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["issues"]) <= 5

    def test_get_issues_search_functionality(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?q=dashboard")
        assert response.status_code == 200
        
        data = response.json()
        for issue in data["issues"]:
            assert "dashboard" in issue["title"].lower() or "dashboard" in issue["body"].lower()

    def test_get_issues_label_filtering(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?label=bug")
        assert response.status_code == 200
        
        data = response.json()
        for issue in data["issues"]:
            assert "bug" in issue["labels"]

    def test_get_issues_sorting_by_age(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?sort_by=age_days&sort_order=asc")
        assert response.status_code == 200
        
        data = response.json()
        issues = data["issues"]
        if len(issues) > 1:
            for i in range(len(issues) - 1):
                assert issues[i]["age_days"] <= issues[i + 1]["age_days"]

    def test_get_issues_sorting_by_title(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?sort_by=title&sort_order=asc")
        assert response.status_code == 200
        
        data = response.json()
        issues = data["issues"]
        if len(issues) > 1:
            for i in range(len(issues) - 1):
                assert issues[i]["title"] <= issues[i + 1]["title"]

    def test_get_issues_test_scenarios_coverage(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues")
        assert response.status_code == 200
        
        data = response.json()
        issues = data["issues"]
        
        has_no_labels = any(len(issue["labels"]) == 0 for issue in issues)
        has_many_labels = any(len(issue["labels"]) > 10 for issue in issues)
        has_closed_issues = any(issue["status"] == "closed" for issue in issues)
        has_old_issues = any(issue["age_days"] > 300 for issue in issues)
        
        assert has_no_labels, "Should have issues without labels"
        assert has_many_labels, "Should have issues with many labels"
        assert has_closed_issues, "Should have closed issues"
        assert has_old_issues, "Should have old issues"

    def test_get_issues_invalid_repo(self, client):
        response = client.get("/api/repos/invalid/repo/issues")
        assert response.status_code == 404

    def test_get_issues_combined_filters(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?q=test&label=bug&sort_by=age_days")
        assert response.status_code == 200
        
        data = response.json()
        for issue in data["issues"]:
            assert "test" in issue["title"].lower() or "test" in issue["body"].lower()
            assert "bug" in issue["labels"]

    def test_scope_issue_endpoint(self, client, test_repo_id):
        response = client.post(f"/api/issues/1001/scope", json={})
        assert response.status_code in [200, 400, 500]

    def test_get_issues_markdown_content(self, client, test_repo_id):
        response = client.get(f"/api/repos/{test_repo_id}/issues?label=markdown")
        assert response.status_code == 200
        
        data = response.json()
        markdown_issues = [issue for issue in data["issues"] if "markdown" in issue["labels"]]
        assert len(markdown_issues) > 0
        
        for issue in markdown_issues:
            assert "#" in issue["body"] or "```" in issue["body"]
