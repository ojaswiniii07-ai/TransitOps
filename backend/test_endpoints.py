"""
Manual smoke-test script for the main API endpoints.
Run directly:  python test_endpoints.py
Not a pytest test — use tests/test_backend.py for that.
"""
from fastapi.testclient import TestClient
from app.main import app


def main() -> None:
    client = TestClient(app)

    checks = [
        ("GET", "/dashboard/kpis"),
        ("GET", "/expenses/"),
        ("GET", "/trips/"),
        ("GET", "/notifications/"),
        ("GET", "/audit-logs/"),
        ("GET", "/maintenance/schedule"),
        ("GET", "/approvals/"),
    ]

    print("\n=== TransitOps API Smoke Test ===\n")
    all_ok = True
    for method, path in checks:
        res = client.request(method, path)
        status = "✅" if res.status_code == 200 else "❌"
        print(f"{status}  {method} {path}  →  {res.status_code}")
        if res.status_code != 200:
            all_ok = False
            print(f"    Response: {res.text[:200]}")

    print()
    if all_ok:
        print("All endpoints OK.")
    else:
        print("Some endpoints failed — see above.")


if __name__ == "__main__":
    main()
