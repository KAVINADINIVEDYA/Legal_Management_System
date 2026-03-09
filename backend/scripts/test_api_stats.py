
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_stats():
    # Login as admin
    login_data = {"username": "admin", "password": "admin123"}
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get stats
    res = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    print("Dashboard Stats Response:")
    print(json.dumps(res.json(), indent=2))
    
    # Get alerts
    res = requests.get(f"{BASE_URL}/dashboard/alerts", headers=headers)
    print("\nDashboard Alerts Response:")
    print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    test_stats()
