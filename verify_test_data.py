#!/usr/bin/env python3
"""
Script to verify the test data system generates the requested Test Issue #1 format
"""
import os
import sys
sys.path.append('backend')

os.environ['LOAD_TEST_DATA'] = 'true'

from backend.app.main import issues_store, repos_store

def main():
    test_repo_id = 'testuser/test-repo'
    
    print("=== Test Data Verification ===")
    print(f"LOAD_TEST_DATA environment variable: {os.getenv('LOAD_TEST_DATA')}")
    
    if test_repo_id in repos_store:
        repo = repos_store[test_repo_id]
        print(f"✅ Test repository found: {repo['id']}")
        print(f"   Owner: {repo['owner']}")
        print(f"   Name: {repo['name']}")
        print(f"   URL: {repo['url']}")
        print(f"   Open Issues Count: {repo['openIssuesCount']}")
    else:
        print("❌ Test repository not found")
        return False
    
    if test_repo_id in issues_store:
        issues = issues_store[test_repo_id]
        print(f"✅ Found {len(issues)} test issues")
        
        issue_1 = next((issue for issue in issues if issue['number'] == 1), None)
        
        if issue_1:
            print("\n=== Test Issue #1 Details ===")
            print(f"Title: {issue_1['title']}")
            print(f"Body: {issue_1['body']}")
            print(f"Labels: {issue_1['labels']}")
            print(f"Number: #{issue_1['number']}")
            print(f"Author: {issue_1['author']}")
            print(f"Status: {issue_1['status']}")
            print(f"Age (days): {issue_1['age_days']}")
            
            expected_title = "Test Issue #1: Sample issue for testing dashboard functionality"
            expected_body = "This is a test issue body for issue #1. It contains sample content for testing the Issue Dashboard."
            
            print("\n=== Format Verification ===")
            title_match = issue_1['title'] == expected_title
            body_match = issue_1['body'] == expected_body
            
            print(f"Title matches expected format: {'✅' if title_match else '❌'}")
            if not title_match:
                print(f"  Expected: {expected_title}")
                print(f"  Actual:   {issue_1['title']}")
            
            print(f"Body matches expected format: {'✅' if body_match else '❌'}")
            if not body_match:
                print(f"  Expected: {expected_body}")
                print(f"  Actual:   {issue_1['body']}")
            
            return title_match and body_match
        else:
            print("❌ Test Issue #1 not found")
            available_numbers = [issue['number'] for issue in issues[:10]]
            print(f"Available issue numbers (first 10): {available_numbers}")
            return False
    else:
        print("❌ No test issues found")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
