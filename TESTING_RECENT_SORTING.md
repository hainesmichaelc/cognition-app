# Testing Recent Sorting Functionality

## Overview
This document outlines comprehensive testing procedures for the recent sorting functionality in the cognition-app issue dashboard. The application provides sorting capabilities for GitHub issues with enhanced test scenarios to validate edge cases.

## Test Data Scenarios

The application includes the following test scenarios specifically designed for recent sorting validation:

### 1. Recent Issues (5 issues)
- **Purpose**: Test basic recent sorting with varied timestamps
- **Labels**: `new`, `urgent`
- **Age Distribution**:
  - Issue 1: 0 days old (1 hour ago)
  - Issue 2: 0 days old (2 hours ago)
  - Issue 3: 1 day old (1 day + 3 hours ago)
  - Issue 4: 2 days old (2 days + 1 hour ago)
  - Issue 5: 3 days old (3 days + 2 hours ago)

### 2. Same Day Issues (5 issues)
- **Purpose**: Test sorting stability for issues created on the same day
- **Labels**: `same-day`, `testing`
- **Age Distribution**: All 0 days old with different hour/minute offsets
- **Expected Behavior**: Should sort by creation time within the same day

### 3. Boundary Issues (3 issues)
- **Purpose**: Test edge cases around day boundaries
- **Labels**: `boundary`, `edge-case`
- **Scenarios**:
  - Issue created 30 minutes ago (0 days)
  - Issue created 1 day + 1 minute ago (1 day)
  - Issue created 1 day - 1 minute ago (1 day)

### 4. Performance Test Recent (10 issues)
- **Purpose**: Test sorting performance with larger datasets
- **Labels**: `performance`, `load-test`
- **Age Distribution**: Varied ages (0-6 days) with different hour/minute offsets

## Manual Testing Procedures

### Prerequisites
1. Start the application: `make dev`
2. Navigate to: http://localhost:5173
3. Access the test repository issues dashboard

### Test Case 1: Basic Recent Sorting
**Objective**: Verify that "Created Date" + "Newest First" shows most recent issues first

**Steps**:
1. Navigate to the issue dashboard
2. Set sorting to "Created Date" 
3. Set order to "Newest First"
4. Observe issue order in the table

**Expected Results**:
- Issues should appear in descending chronological order
- Most recently created issues appear at the top
- Same-day issues should be ordered by creation time

### Test Case 2: Sort Order Toggle
**Objective**: Verify that sort order toggle works correctly

**Steps**:
1. Set sorting to "Created Date" + "Newest First"
2. Note the current order
3. Change to "Oldest First"
4. Observe the order change

**Expected Results**:
- Order should reverse completely
- Oldest issues should now appear at the top
- Sort should remain stable for identical timestamps

### Test Case 3: Same-Day Issue Sorting
**Objective**: Verify sorting stability for issues created on the same day

**Steps**:
1. Filter issues to show only "same-day" label
2. Set sorting to "Created Date" + "Newest First"
3. Observe the order of same-day issues

**Expected Results**:
- Same-day issues should be ordered by creation time
- Issues created more recently within the day should appear first
- Order should be consistent across page refreshes

### Test Case 4: Boundary Condition Testing
**Objective**: Test edge cases around day boundaries

**Steps**:
1. Filter issues to show only "boundary" label
2. Set sorting to "Created Date" + "Newest First"
3. Verify the order of boundary issues

**Expected Results**:
- Issues should be correctly categorized by age_days
- Sorting should handle minute-level precision correctly
- No issues should appear in wrong day categories

### Test Case 5: Pagination Consistency
**Objective**: Verify sorting consistency across paginated results

**Steps**:
1. Set page size to a small value (e.g., 5 issues per page)
2. Set sorting to "Created Date" + "Newest First"
3. Navigate through multiple pages
4. Verify that issues maintain correct chronological order across pages

**Expected Results**:
- Issues on page 2 should be older than all issues on page 1
- No issues should appear out of chronological order
- Page navigation should maintain sort consistency

### Test Case 6: Performance with Large Datasets
**Objective**: Verify sorting performance with larger datasets

**Steps**:
1. Load the full dataset (40+ issues)
2. Set sorting to "Created Date" + "Newest First"
3. Measure response time and UI responsiveness
4. Test sorting toggle performance

**Expected Results**:
- Sorting should complete within reasonable time (< 1 second)
- UI should remain responsive during sorting
- Large datasets should not cause performance degradation

## Validation Criteria

### Functional Requirements
- ✅ Recent issues appear before older issues when sorted by "Created Date" + "Newest First"
- ✅ Sort order reverses correctly when toggling between "Newest First" and "Oldest First"
- ✅ Same-day issues are ordered by creation time within the day
- ✅ Boundary conditions (day transitions) are handled correctly
- ✅ Sorting is stable for issues with identical timestamps
- ✅ Pagination maintains sort consistency across pages

### Performance Requirements
- ✅ Sorting completes within 1 second for datasets up to 100 issues
- ✅ UI remains responsive during sorting operations
- ✅ Memory usage remains stable during sort operations

### Edge Case Handling
- ✅ Issues created within the same minute are sorted consistently
- ✅ Empty result sets don't cause sorting errors
- ✅ Mixed old and recent issues sort correctly
- ✅ Timezone handling is consistent

## Troubleshooting

### Common Issues
1. **Inconsistent Sort Order**: Check that secondary sort criteria (issue number) is being applied
2. **Performance Issues**: Verify that sorting is happening on the backend, not frontend
3. **Pagination Problems**: Ensure total count calculation includes sort parameters

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API responses include correct sort parameters
3. Test with different page sizes to isolate pagination issues
4. Use browser dev tools to monitor network requests

## Test Results Template

```
Test Date: ___________
Tester: ___________
Application Version: ___________

Test Case 1 - Basic Recent Sorting: ✅ PASS / ❌ FAIL
Notes: ___________

Test Case 2 - Sort Order Toggle: ✅ PASS / ❌ FAIL  
Notes: ___________

Test Case 3 - Same-Day Issue Sorting: ✅ PASS / ❌ FAIL
Notes: ___________

Test Case 4 - Boundary Condition Testing: ✅ PASS / ❌ FAIL
Notes: ___________

Test Case 5 - Pagination Consistency: ✅ PASS / ❌ FAIL
Notes: ___________

Test Case 6 - Performance with Large Datasets: ✅ PASS / ❌ FAIL
Notes: ___________

Overall Result: ✅ PASS / ❌ FAIL
Additional Notes: ___________
```

## Automated Testing Considerations

For future enhancement, consider implementing:
- Unit tests for sorting logic
- Integration tests for API endpoints
- End-to-end tests for UI sorting behavior
- Performance benchmarks for large datasets
