# Test Quick Start Guide - Enhanced Club Profiles (PHASE 4)

## Quick Commands

### Run All PHASE 4 Tests

```bash
# Backend tests
cd backend
npm test tests/integration/club-enhanced-profile.test.ts
npm test tests/validators/club.validators.test.ts

# Frontend tests
cd frontend
npm test ClubDetailPage.test.tsx
```

### Run All Tests with Coverage

```bash
# Backend
cd backend
npm test -- --coverage tests/integration/club-enhanced-profile.test.ts tests/validators/club.validators.test.ts

# Frontend
cd frontend
npm run test:coverage ClubDetailPage.test.tsx
```

---

## Test Files Location

| Type | File Path | Tests |
|------|-----------|-------|
| Backend Integration | `/backend/tests/integration/club-enhanced-profile.test.ts` | 25 |
| Backend Validators | `/backend/tests/validators/club.validators.test.ts` | 56 |
| Frontend Components | `/frontend/src/pages/__tests__/ClubDetailPage.test.tsx` | 31 |
| **TOTAL** | **3 files** | **112** |

---

## What's Tested

### ✅ Backend Integration Tests (25 tests)
- Club creation by admin
- Club updates by owner and admin
- Authorization checks (403 errors for non-owners)
- Publication filtering (published/unpublished clubs)
- Error handling (404, validation errors)

### ✅ Backend Validator Tests (56 tests)
- createClubSchema validation
- updateClubSchema validation
- operatingHoursSchema validation
- pricingTiersSchema validation
- ID schemas (UUID validation)
- Edge cases and boundary conditions

### ✅ Frontend Component Tests (31 tests)
- Full profile display
- Missing optional fields handling
- Empty states
- Loading and error states
- Contact and location information
- Accessibility features

---

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something', async () => {
  // Arrange: Set up test data
  const testData = createMockData();
  mockService.mockResolvedValue(testData);

  // Act: Execute the code
  const result = await functionUnderTest();

  // Assert: Verify the result
  expect(result).toEqual(expectedValue);
});
```

### Mock Helpers
```typescript
// Create mock data with defaults and overrides
const club = createMockClub({ name: 'Custom Name' });

// Mock service responses
mockCreateClub.mockResolvedValue(club);
mockUpdateClub.mockRejectedValue(new Error('Not found'));
```

---

## Debugging Failed Tests

### View Detailed Output
```bash
# Backend
npm test -- --verbose tests/integration/club-enhanced-profile.test.ts

# Frontend
npm test -- --reporter=verbose ClubDetailPage.test.tsx
```

### Debug Single Test
```typescript
// Add .only to run a single test
it.only('should do something', () => {
  // Test code
});

// Or use describe.only for a test suite
describe.only('Club Creation', () => {
  // Tests
});
```

### Check Mock Calls
```typescript
// See what arguments a mock was called with
expect(mockService).toHaveBeenCalledWith(expectedArgs);

// See all calls to a mock
console.log(mockService.mock.calls);
```

---

## Common Issues and Solutions

### Issue: Tests failing due to missing mocks
**Solution**: Ensure all mocks are set up in `beforeEach()`:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  mockService.mockResolvedValue(defaultValue);
});
```

### Issue: Async tests timing out
**Solution**: Add proper `await` and use `waitFor()`:
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

### Issue: UUID validation failing
**Solution**: Use valid UUID v4 format:
```typescript
const validId = '550e8400-e29b-41d4-a716-446655440000';
// OR
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Backend Tests
  run: |
    cd backend
    npm test tests/integration/club-enhanced-profile.test.ts
    npm test tests/validators/club.validators.test.ts

- name: Run Frontend Tests
  run: |
    cd frontend
    npm test ClubDetailPage.test.tsx
```

---

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Backend Integration | >80% | Expected 95%+ |
| Backend Validators | >90% | Expected 100% |
| Frontend Components | >70% | Expected 85%+ |

---

## Next Steps

After running tests:

1. ✅ **All tests pass**: Ready for code review
2. ❌ **Tests fail**: Review error messages and fix implementation
3. ⚠️ **Coverage low**: Add more edge case tests
4. 📊 **Review coverage report**: Identify untested code paths

---

## Additional Resources

- **Backend Test Setup**: `/backend/tests/setup.ts`
- **Backend Test Utils**: `/backend/tests/utils/testUtils.ts`
- **Frontend Test Examples**: `/frontend/src/pages/__tests__/BoxerDetailPage.test.tsx`
- **Full Testing Summary**: `/backend/PHASE4_TESTING_SUMMARY.md`

---

**Quick Tip**: Use `npm test -- --watch` for test-driven development!
