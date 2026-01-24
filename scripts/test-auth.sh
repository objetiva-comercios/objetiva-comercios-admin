#!/usr/bin/env bash
set -e

echo "Testing Backend Authentication (AUTH-05)"
echo "========================================="
echo ""

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "❌ Backend is not running on localhost:3001"
  echo "   Start it with: pnpm dev --filter=@objetiva/backend"
  exit 1
fi

echo "✓ Backend is running"
echo ""

# Test 1: Health check
echo "Test 1: Health check (no auth required)"
if curl -s http://localhost:3001/health | grep -q "ok"; then
  echo "✓ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi
echo ""

# Test 2: Protected endpoint without token
echo "Test 2: Protected endpoint without token (should return 401)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/auth/verify)
if [ "$HTTP_CODE" = "401" ]; then
  echo "✓ Correctly rejected request without token (401)"
else
  echo "❌ Expected 401, got $HTTP_CODE"
  exit 1
fi
echo ""

# Test 3: Protected endpoint with invalid token
echo "Test 3: Protected endpoint with invalid token (should return 401)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid_token_12345" \
  http://localhost:3001/api/auth/verify)
if [ "$HTTP_CODE" = "401" ]; then
  echo "✓ Correctly rejected invalid token (401)"
else
  echo "❌ Expected 401, got $HTTP_CODE"
  exit 1
fi
echo ""

echo "========================================="
echo "✓ All basic auth tests passed (AUTH-05)"
echo ""
echo "To test with a valid Supabase JWT:"
echo "  curl -H \"Authorization: Bearer YOUR_TOKEN\" \\"
echo "    http://localhost:3001/api/auth/verify"
echo ""
echo "See README.md 'Testing Authentication' section for how to get a token."
